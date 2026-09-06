/**
 * THE WIRE'S GATE (foundations F6.1) — every client→server message is
 * admitted by exactly one validator, and the table is TOTAL over the
 * C2S union: a new message type FAILS TO COMPILE until it has a row
 * here. The old 480-line switch dropped unknown-but-declared shapes
 * through a silent default; now the only silent drop is a truly
 * unknown t. Each row is one former switch arm, moved verbatim.
 */
import { EQUIP_SLOTS, type EquipSlot } from '../entities.js';
import { sanitizeLook } from '../look.js';
import { sanitizePetArts } from '../sim/pets.js';
import { DYE_COUNT } from '../world/tiles.js';
import type { C2SInput, C2SMessage } from './messages.js';

export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Parse + structurally validate a client message. Returns null for
 * anything malformed — the caller decides whether to drop or disconnect.
 */

type C2SValidators = {
  readonly [K in C2SMessage['t']]: (msg: Record<string, unknown>) => Extract<C2SMessage, { t: K }> | null;
};

/** Exported for the server's dispatch-table pin (one row per validator). */
export const C2S_VALIDATORS: C2SValidators = {
  hello: (msg) => {
    if (!isFiniteNum(msg.v)) return null;
    if (msg.name !== undefined && typeof msg.name !== 'string') return null;
    if (msg.token !== undefined && typeof msg.token !== 'string') return null;
    return { t: 'hello', v: msg.v, name: msg.name, token: msg.token };
  },
  login: (msg) => {
    if (typeof msg.user !== 'string' || typeof msg.pass !== 'string') return null;
    if (msg.user.length > 64 || msg.pass.length > 128) return null;
    return { t: 'login', user: msg.user, pass: msg.pass };
  },
  register: (msg) => {
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
  },
  logout: (msg) => {
    return { t: 'logout' };
  },
  input: (msg) => {
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
  },
  chat: (msg) => {
    if (typeof msg.text !== 'string') return null;
    return { t: 'chat', text: msg.text };
  },
  ping: (msg) => {
    if (!isFiniteNum(msg.ct)) return null;
    return { t: 'ping', ct: msg.ct };
  },
  interact: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    return { t: 'interact', tx: msg.tx, ty: msg.ty };
  },
  signedit: (msg) => {
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
  },
  waypoint: (msg) => {
    const hasX = msg.x !== undefined;
    const hasY = msg.y !== undefined;
    if (hasX !== hasY) return null; // set needs both, clear needs neither
    if (!hasX) return { t: 'waypoint' };
    if (!isFiniteNum(msg.x) || !isFiniteNum(msg.y)) return null;
    if (!Number.isInteger(msg.x) || !Number.isInteger(msg.y)) return null;
    if (Math.abs(msg.x) > 1_000_000 || Math.abs(msg.y) > 1_000_000) return null;
    if (msg.plane !== undefined && (typeof msg.plane !== 'string' || msg.plane.length > 64)) {
      return null;
    }
    return msg.plane !== undefined
      ? { t: 'waypoint', x: msg.x, y: msg.y, plane: msg.plane }
      : { t: 'waypoint', x: msg.x, y: msg.y };
  },
  questabandon: (msg) => {
    if (typeof msg.quest !== 'string' || msg.quest.length === 0 || msg.quest.length > 64) {
      return null;
    }
    return { t: 'questabandon', quest: msg.quest };
  },
  use: (msg) => {
    if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
    if (msg.slot < 0 || msg.slot >= 64) return null;
    // WHITELIST LESSON: the stow destination joins the parse or dies
    // silently at this door. Literal `true` only — never truthy. The
    // off-hand aim (THE DELIBERATE PAIR) obeys the same law.
    return {
      t: 'use',
      slot: msg.slot,
      ...(msg.stow === true ? { stow: true as const } : {}),
      ...(msg.off === true ? { off: true as const } : {}),
    };
  },
  unequip: (msg) => {
    if (typeof msg.slot !== 'string') return null;
    const slot = msg.slot as EquipSlot;
    if (!EQUIP_SLOTS.includes(slot)) return null;
    return { t: 'unequip', slot };
  },
  invmove: (msg) => {
    if (!isFiniteNum(msg.from) || !Number.isInteger(msg.from)) return null;
    if (!isFiniteNum(msg.to) || !Number.isInteger(msg.to)) return null;
    if (msg.from < 0 || msg.from >= 64 || msg.to < 0 || msg.to >= 64) return null;
    if (msg.from === msg.to) return null;
    return { t: 'invmove', from: msg.from, to: msg.to, ...(msg.merge === true ? { merge: true } : {}) };
  },
  dropitem: (msg) => {
    if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
    if (msg.slot < 0 || msg.slot >= 64) return null;
    if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty)) return null;
    if (msg.qty < 1 || msg.qty > 100000) return null;
    return { t: 'dropitem', slot: msg.slot, qty: msg.qty };
  },
  unmake: (msg) => {
    // THE WIRE KNOWS THE BENCH. This branch is load-bearing history:
    // the Unmaking shipped whole (bench, server door, tests) while
    // this validator never learned its message, so every press fell
    // through `default: null` and earned an abuse strike — three
    // presses closed the socket. A C2S message is only real once it
    // has a case here; messages.test.ts pins both doors open.
    if (msg.slots !== undefined) {
      if (msg.slot !== undefined) return null; // one dialect per message
      if (!Array.isArray(msg.slots)) return null;
      if (msg.slots.length < 1 || msg.slots.length > 64) return null;
      const slots: number[] = [];
      const seen = new Set<number>();
      for (const s of msg.slots) {
        if (!isFiniteNum(s) || !Number.isInteger(s) || s < 0 || s >= 64) return null;
        if (seen.has(s)) return null; // a piece named twice is a client bug, not a bigger yield
        seen.add(s);
        slots.push(s);
      }
      return { t: 'unmake', slots };
    }
    if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
    if (msg.slot < 0 || msg.slot >= 64) return null;
    return { t: 'unmake', slot: msg.slot };
  },
  sunder: (msg) => {
    // The bench sends slot -1 when `worn` names the piece instead —
    // the pack index is a passenger there, but it still parses
    // strictly so a junk value never rides in on the worn dialect.
    if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
    if (msg.slot < -1 || msg.slot >= 64) return null;
    let worn: EquipSlot | undefined;
    if (msg.worn !== undefined) {
      if (typeof msg.worn !== 'string' || !EQUIP_SLOTS.includes(msg.worn as EquipSlot)) {
        return null;
      }
      worn = msg.worn as EquipSlot;
    }
    if (msg.slot < 0 && worn === undefined) return null; // -1 only makes sense worn
    let seat: 'ward' | 'art' | undefined;
    if (msg.seat !== undefined) {
      if (msg.seat !== 'ward' && msg.seat !== 'art') return null;
      seat = msg.seat;
    }
    return { t: 'sunder', slot: msg.slot, worn, seat };
  },
  craft: (msg) => {
    if (typeof msg.recipe !== 'string' || msg.recipe.length > 64) return null;
    if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty)) return null;
    if (msg.qty < 1 || msg.qty > 1000) return null;
    return { t: 'craft', recipe: msg.recipe, qty: msg.qty };
  },
  craftstop: (msg) => {
    return { t: 'craftstop' };
  },
  bank: (msg) => {
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
  },
  shop: (msg) => {
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
  },
  build: (msg) => {
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
  },
  demolish: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    return { t: 'demolish', tx: msg.tx, ty: msg.ty };
  },
  ownbuilt: (msg) => {
    return { t: 'ownbuilt' };
  },
  plant: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    if (typeof msg.seed !== 'string' || msg.seed.length > 64) return null;
    return { t: 'plant', tx: msg.tx, ty: msg.ty, seed: msg.seed };
  },
  fertilize: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    return { t: 'fertilize', tx: msg.tx, ty: msg.ty };
  },
  mulch: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    return { t: 'mulch', tx: msg.tx, ty: msg.ty };
  },
  prune: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    return { t: 'prune', tx: msg.tx, ty: msg.ty };
  },
  compostadd: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot) || msg.slot < 0 || msg.slot > 63) {
      return null;
    }
    return { t: 'compostadd', tx: msg.tx, ty: msg.ty, slot: msg.slot };
  },
  troughadd: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot) || msg.slot < 0 || msg.slot > 63) {
      return null;
    }
    return { t: 'troughadd', tx: msg.tx, ty: msg.ty, slot: msg.slot };
  },
  stockname: (msg) => {
    if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot) || msg.slot < 0 || msg.slot > 15) {
      return null;
    }
    if (typeof msg.name !== 'string' || msg.name.length > 24) return null;
    return { t: 'stockname', slot: msg.slot, name: msg.name };
  },
  workstart: (msg) => {
    if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
    if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
    if (typeof msg.recipe !== 'string' || msg.recipe.length > 64) return null;
    if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty) || msg.qty < 1 || msg.qty > 50) {
      return null;
    }
    return { t: 'workstart', tx: msg.tx, ty: msg.ty, recipe: msg.recipe, qty: msg.qty };
  },
  interactnpc: (msg) => {
    if (!isFiniteNum(msg.eid) || !Number.isInteger(msg.eid) || msg.eid < 0) return null;
    return { t: 'interactnpc', eid: msg.eid };
  },
  dlgadv: (msg) => {
    return { t: 'dlgadv' };
  },
  dlgchoice: (msg) => {
    if (!isFiniteNum(msg.idx) || !Number.isInteger(msg.idx) || msg.idx < 0 || msg.idx > 3) {
      return null;
    }
    return { t: 'dlgchoice', idx: msg.idx };
  },
  dlgend: (msg) => {
    return { t: 'dlgend' };
  },
  usekey: (msg) => {
    if (!isFiniteNum(msg.key) || !Number.isInteger(msg.key) || msg.key < 0 || msg.key > 0x7fffffff) {
      return null;
    }
    return { t: 'usekey', key: msg.key };
  },
  keydrop: (msg) => {
    if (!isFiniteNum(msg.key) || !Number.isInteger(msg.key) || msg.key < 0 || msg.key > 0x7fffffff) {
      return null;
    }
    return { t: 'keydrop', key: msg.key };
  },
  keylabel: (msg) => {
    if (!isFiniteNum(msg.seed) || !Number.isInteger(msg.seed) || msg.seed < 0 || msg.seed > 0xffffffff) {
      return null;
    }
    if (msg.label !== undefined && (typeof msg.label !== 'string' || msg.label.length > 64)) {
      return null;
    }
    return { t: 'keylabel', seed: msg.seed, label: msg.label };
  },
  keyforge: (msg) => {
    if (!isFiniteNum(msg.seed) || !Number.isInteger(msg.seed) || msg.seed < 0 || msg.seed > 0xffffffff) {
      return null;
    }
    return { t: 'keyforge', seed: msg.seed };
  },
  pickup: (msg) => {
    if (!isFiniteNum(msg.eid) || !Number.isInteger(msg.eid) || msg.eid < 0) return null;
    return { t: 'pickup', eid: msg.eid };
  },
  technique: (msg) => {
    if (typeof msg.ability !== 'string' || msg.ability.length > 64) return null;
    if (msg.slot !== 0 && msg.slot !== 2) return null;
    return { t: 'technique', ability: msg.ability, slot: msg.slot };
  },
  calling: (msg) => {
    if (typeof msg.calling !== 'string' || msg.calling.length > 64) return null;
    if (typeof msg.on !== 'boolean') return null;
    const rank =
      typeof msg.rank === 'number' && Number.isFinite(msg.rank)
        ? Math.max(1, Math.min(4, Math.floor(msg.rank)))
        : undefined;
    return { t: 'calling', calling: msg.calling, on: msg.on, ...(rank !== undefined ? { rank } : {}) };
  },
  setlook: (msg) => {
    const look = sanitizeLook(msg.look);
    if (!look) return null;
    return { t: 'setlook', look };
  },
  carrystyle: (msg) => {
    if (msg.style !== 'normal' && msg.style !== 'rogue') return null;
    if (msg.hand !== undefined && msg.hand !== 'main' && msg.hand !== 'off') return null;
    return { t: 'carrystyle', style: msg.style, hand: msg.hand };
  },
  lootpref: (msg) => {
    if (typeof msg.auto !== 'boolean') return null;
    return { t: 'lootpref', auto: msg.auto };
  },
  takeall: (msg) => {
    return { t: 'takeall' };
  },
  petname: (msg) => {
    // Slot bounds are THREE STALLS; the name is only length-gated
    // here — the shared sanitizer renders the real verdict server-
    // side, so a junk ask costs a refusal line, never a strike.
    if (msg.slot !== 0 && msg.slot !== 1 && msg.slot !== 2) return null;
    if (typeof msg.name !== 'string' || msg.name.length > 40) return null;
    return { t: 'petname', slot: msg.slot, name: msg.name };
  },
  stable: (msg) => {
    if (msg.op !== 'heel' && msg.op !== 'stable' && msg.op !== 'release') return null;
    if (msg.slot !== 0 && msg.slot !== 1 && msg.slot !== 2) return null;
    return { t: 'stable', op: msg.op, slot: msg.slot };
  },
  companionop: (msg) => {
    if (msg.op !== 'heel' && msg.op !== 'home' && msg.op !== 'part') return null;
    if (msg.slot !== 0 && msg.slot !== 1 && msg.slot !== 2) return null;
    return { t: 'companionop', op: msg.op, slot: msg.slot };
  },
  companionname: (msg) => {
    // Slot bounds are THE COMPANY CAP; the name is only length-gated
    // here — the shared sanitizer renders the real verdict server-
    // side (the petname law, held separately).
    if (msg.slot !== 0 && msg.slot !== 1 && msg.slot !== 2) return null;
    if (typeof msg.name !== 'string' || msg.name.length > 40) return null;
    return { t: 'companionname', slot: msg.slot, name: msg.name };
  },
  petarts: (msg) => {
    // Slot bounds are THREE STALLS; the loadout is only shape-gated
    // here (the shared sanitizer) — repertoire membership, the
    // focus budget, and the fight gate all render their verdicts
    // server-side, each aloud.
    if (msg.slot !== 0 && msg.slot !== 1 && msg.slot !== 2) return null;
    const arts = sanitizePetArts(msg.arts);
    if (arts === null) return null;
    return { t: 'petarts', slot: msg.slot, arts };
  },
  social: (msg) => {
    return { t: 'social' };
  },
  friendsearch: (msg) => {
    if (typeof msg.query !== 'string' || msg.query.length > 24) return null;
    return { t: 'friendsearch', query: msg.query };
  },
  friendrequest: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'friendrequest', name: msg.name };
  },
  friendaccept: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'friendaccept', name: msg.name };
  },
  frienddecline: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'frienddecline', name: msg.name };
  },
  friendremove: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'friendremove', name: msg.name };
  },
  party: (msg) => {
    return { t: 'party' };
  },
  partyinvite: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'partyinvite', name: msg.name };
  },
  partyaccept: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'partyaccept', name: msg.name };
  },
  partydecline: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'partydecline', name: msg.name };
  },
  partyleave: (msg) => {
    return { t: 'partyleave' };
  },
  partykick: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'partykick', name: msg.name };
  },
  partydisband: (msg) => {
    return { t: 'partydisband' };
  },
  partyjoinrun: (msg) => {
    if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
    return { t: 'partyjoinrun', name: msg.name };
  },
  arenaqueue: (msg) => {
    if (typeof msg.match !== 'string' || msg.match.length > 40) return null;
    return { t: 'arenaqueue', match: msg.match };
  },
  arenaleave: (msg) => {
    return { t: 'arenaleave' };
  },
};

export function parseC2S(raw: string): C2SMessage | null {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(msg) || typeof msg.t !== 'string') return null;
  // THE GATE OWNS ITS KEYS: the table is a plain object with
  // Object.prototype behind it, so `t: "hasOwnProperty"` (or valueOf,
  // constructor, __proto__ ...) would resolve to a prototype member —
  // a throw inside the socket handler, or for `constructor` the RAW
  // client object handed back as "validated". Only an own key is a row.
  if (!Object.hasOwn(C2S_VALIDATORS, msg.t)) return null;
  const validate = (C2S_VALIDATORS as Record<string, (m: Record<string, unknown>) => C2SMessage | null>)[
    msg.t
  ];
  return validate ? validate(msg) : null;
}
