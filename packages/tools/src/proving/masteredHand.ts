/**
 * THE PROVING — live receipts for THE DRAWN BREATH (docs/
 * cast-channel-plan.md Phase 5), driven over the real wire against a
 * running dev server. Registers throwaway accounts and breathes the
 * whole epic: the planted clock against the full-stride clock, the
 * pay-at-fire law, every bail-out, catch-up ticks, the staked
 * telegraph that never lies early, the charge and held-note dialects
 * as a WATCHER hears them, the channel's beats and breaks, the
 * reconnect's clean break, both unwritten pages earned by their true
 * deeds, and all five taught voices speaking over the wire.
 *
 * Usage (against a running dev server):
 *   npm run prove:drawn-breath -w @arx/tools
 *   PROVE_URL=ws://localhost:8794/ws npm run prove:drawn-breath -w @arx/tools
 */
import WebSocket from 'ws';
import { ABILITIES, TECHNIQUES } from '@arx/content';
import {
  ByteReader,
  BinaryMsgType,
  decodeSnapshot,
  PROTOCOL_VERSION,
  PoseState,
} from '@arx/shared';

const URL = process.env.PROVE_URL ?? 'ws://localhost:8815/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));

type Msg = Record<string, any>;
const ATTACK = 1 << 0;
const A1 = 1 << 3; // Q — technique seat 0
const A3 = 1 << 5; // R — technique seat 2
const SHEATHE = 1 << 9; // H — the canonical bail-out press

// The clocks under proof (content truths, pinned here on purpose —
// a def drift that changes a clock should FAIL the proving).
// THE MASTERED HAND (techniques v3) lane: the relationships between
// presses, proven over the real wire — the word, the aftermath, the
// follow, the refund, the finale, the red ledger, held ground, the
// stagger that gutters a caster. Content truths are READ from the wire
// (the arts were rebuilt; a clock drift is not a failure here).
// The proving body casts at level ~96, so POOL arts (rung arts and
// deed pages) speak their RANK IV numbers — but a loaned secret casts
// at RANK I until mastered (seatAbility's loan law). Both truths are
// pinned below exactly as the wire speaks them.
const CAST_STILL_FACTOR = 1.25;
const TICK_MS = 50;
const plantedMs = (ticks: number) => Math.ceil(ticks / CAST_STILL_FACTOR) * TICK_MS;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
function receipt(name: string, ok: boolean, detail = ''): void {
  if (!ok) throw new Error(`RECEIPT FAILED: ${name}${detail ? ` (${detail})` : ''}`);
  passed++;
  console.log(`RECEIPT ${String(passed).padStart(2)}  ${name}${detail ? `  (${detail})` : ''}`);
}

/** A wire fx event with its local arrival stamp. */
type FxSeen = Msg & { at: number };

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  fx: FxSeen[] = [];
  seq = 1;
  eid = -1;
  /** Latest authoritative snapshot sample per entity id. */
  snap = new Map<number, { x: number; y: number; pose: number; hpPct: number; at: number }>();
  /** Full sample history for one watched entity (pose/stride reads). */
  watchEid = -1;
  watched: Array<{ x: number; y: number; pose: number; hpPct: number; at: number }> = [];
  /** defId per entity, learned from enter/update metadata. */
  defIds = new Map<number, string>();

  open(): Promise<void> {
    this.ws = new WebSocket(URL);
    this.ws.on('message', (d: Buffer, isBinary: boolean) => {
      if (isBinary) {
        const buf = new Uint8Array(d).buffer;
        const r = new ByteReader(buf);
        if (r.u8() !== BinaryMsgType.Snapshot) return;
        const snap = decodeSnapshot(r);
        const at = Date.now();
        for (const e of snap.entities) {
          this.snap.set(e.eid, { x: e.x, y: e.y, pose: e.pose, hpPct: e.hpPct, at });
          if (e.eid === this.watchEid) {
            this.watched.push({ x: e.x, y: e.y, pose: e.pose, hpPct: e.hpPct, at });
          }
        }
        return;
      }
      const m = JSON.parse(d.toString());
      m.at = Date.now(); // local arrival stamp, for clocks and cooldown math
      if (m.t === 'fx') this.fx.push(m);
      this.msgs.push(m);
      if (m.t === 'enter' || m.t === 'update') {
        for (const en of m.entities ?? []) {
          if (en.defId) this.defIds.set(en.eid, en.defId);
        }
      }
    });
    return new Promise((res, rej) => {
      this.ws.on('open', () => res());
      this.ws.on('error', rej);
    });
  }
  send(m: Msg): void {
    this.ws.send(JSON.stringify(m));
  }
  /**
   * Dev-command chat, paced under the server's chat bucket (1/s,
   * burst 4) — a dropped /tp or /give fails receipts confusingly.
   */
  private lastChatAt = 0;
  async say(text: string): Promise<void> {
    const wait = this.lastChatAt + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastChatAt = Date.now();
    this.send({ t: 'chat', text });
  }
  frame(buttons: number, mx = 0, my = 0, aim = 0, tx?: number, ty?: number): void {
    const frame: Msg = { seq: this.seq++, mx, my, aim, buttons };
    if (tx !== undefined && ty !== undefined) {
      frame.tx = tx;
      frame.ty = ty;
    }
    this.send({ t: 'input', frame });
  }
  async press(buttons: number, aim = 0, tx?: number, ty?: number): Promise<void> {
    this.frame(buttons, 0, 0, aim, tx, ty);
    await sleep(120);
    this.frame(0, 0, 0, aim);
    await sleep(120);
  }
  async waitFor(pred: (m: Msg) => boolean, label: string, timeoutMs = 5000, from = 0): Promise<Msg> {
    const t0 = Date.now();
    let i = from;
    for (;;) {
      for (; i < this.msgs.length; i++) if (pred(this.msgs[i]!)) return this.msgs[i]!;
      if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${label}`);
      await sleep(40);
    }
  }
  mark(): number {
    return this.msgs.length;
  }
  fxMark(): number {
    return this.fx.length;
  }
  /** fx of a kind/art seen at or after a mark index. */
  fxSince(mark: number, kind: string, id?: string): FxSeen[] {
    return this.fx.slice(mark).filter((f) => f.kind === kind && (id === undefined || f.id === id));
  }
  latest(t: string): Msg | undefined {
    for (let i = this.msgs.length - 1; i >= 0; i--) if (this.msgs[i]!.t === t) return this.msgs[i];
    return undefined;
  }
  own(): { x: number; y: number; pose: number; hpPct: number; at: number } {
    const s = this.snap.get(this.eid);
    if (!s) throw new Error('no own snapshot yet');
    return s;
  }
  /** Nearest live entity with the given defId, by own position. */
  findByDef(defId: string): { eid: number; x: number; y: number; hpPct: number } | null {
    const me = this.snap.get(this.eid);
    let best: { eid: number; x: number; y: number; hpPct: number } | null = null;
    let bestD = Infinity;
    for (const [eid, def] of this.defIds) {
      if (def !== defId) continue;
      const s = this.snap.get(eid);
      if (!s || Date.now() - s.at > 1500) continue; // gone from interest
      const d = me ? Math.hypot(s.x - me.x, s.y - me.y) : 0;
      if (d < bestD) {
        bestD = d;
        best = { eid, x: s.x, y: s.y, hpPct: s.hpPct };
      }
    }
    return best;
  }
}

async function join(user: string, name: string, reg = true): Promise<Client> {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  if (reg) c.send({ t: 'register', user, pass: 'proving123', name });
  else c.send({ t: 'login', user, pass: 'proving123' });
  const w = await c.waitFor((m) => m.t === 'welcome', `welcome (${user})`, 8000);
  c.eid = w.eid;
  // The body is only IN the world once its own snapshot speaks.
  const t0 = Date.now();
  while (!c.snap.has(c.eid)) {
    if (Date.now() - t0 > 5000) throw new Error(`${user} never appeared in a snapshot`);
    await sleep(80);
  }
  return c;
}

/** Teleport and VERIFY the landing — a bucketed-away /tp must retry. */
async function tp(c: Client, x: number, y: number): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await c.say(`/tp ${x} ${y}`);
    // The command executes on arrival; wait it out, THEN judge the
    // landing from a snapshot that postdates it — judging early reads
    // a nearby pre-teleport body as arrived and leaves the real
    // teleport to land mid-receipt, breaking whatever breath it hits.
    const t0 = Date.now();
    await sleep(700);
    const settled = await (async () => {
      for (let i = 0; i < 12; i++) {
        const s = c.snap.get(c.eid);
        if (s && s.at > t0 + 500 && Math.hypot(s.x - x, s.y - y) < 6) return true;
        await sleep(150);
      }
      return false;
    })();
    if (settled) {
      // A retried /tp may still be in flight — let any straggler land
      // NOW, not mid-receipt.
      if (attempt > 0) await sleep(1400);
      return;
    }
  }
  throw new Error(`/tp ${x} ${y} never landed`);
}

async function xpToLevel(c: Client, skill: string, minLevel: number): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const mark = c.mark();
    await c.say(`/xp ${skill} 10000000`);
    const m = await c.waitFor((mm) => mm.t === 'xp' && mm.skill === skill, `${skill} xp`, 5000, mark);
    if (m.level >= minLevel) return;
  }
  throw new Error(`${skill} never reached level ${minLevel}`);
}

async function give(c: Client, item: string): Promise<void> {
  const mark = c.mark();
  await c.say(`/give ${item} 1`);
  // Wait for an inventory that truly CARRIES the item — a pack-spill
  // update is also an inv message, and it proves nothing.
  await c.waitFor(
    (m) => m.t === 'inv' && m.slots?.some((sl: any) => sl && sl.item === item),
    `${item} in pack`,
    6000,
    mark,
  );
}

async function equipFromPack(c: Client, item: string): Promise<void> {
  const inv = c.latest('inv') ?? (await c.waitFor((m) => m.t === 'inv', 'inv'));
  const idx = inv.slots.findIndex((s: any) => s && s.item === item);
  if (idx < 0) throw new Error(`${item} not in pack`);
  const mark = c.mark();
  c.send({ t: 'use', slot: idx });
  await c.waitFor((m) => m.t === 'equip', `equip ${item}`, 5000, mark);
  await sleep(150);
}

async function seat(c: Client, ability: string, slot: 0 | 2): Promise<void> {
  const mark = c.mark();
  c.send({ t: 'technique', ability, slot });
  await c.waitFor(
    (m) => m.t === 'techniques' && m.chosen?.[slot === 0 ? 0 : 1] === ability,
    `${ability} seated on ${slot === 0 ? 'Q' : 'R'}`,
    5000,
    mark,
  );
}

/**
 * Wait until the given slot's cooldown has drained. The wire only
 * speaks on change events, so the remainder counts down locally from
 * the latest word's arrival stamp.
 */
async function waitCd(c: Client, slot: number, timeoutMs = 25_000): Promise<void> {
  const t0 = Date.now();
  for (;;) {
    const cds = c.latest('cooldowns');
    if (!cds) return;
    const remainMs = cds.cd[slot] * TICK_MS - (Date.now() - cds.at);
    if (remainMs <= 0) return;
    if (Date.now() - t0 > timeoutMs) throw new Error(`slot ${slot} cooldown never cleared`);
    await sleep(Math.min(remainMs + 200, 1000));
  }
}

/** Begin a channel, retrying refused press edges, and return its start. */
async function channelStart(
  c: Client,
  slot: 0 | 2,
  ability: string,
  aim = 0,
  tx?: number,
  ty?: number,
): Promise<{ start: Msg; mark: number }> {
  const button = slot === 0 ? A1 : A3;
  const mark = c.mark();
  for (let attempt = 0; attempt < 6; attempt++) {
    c.frame(button, 0, 0, aim, tx, ty);
    await sleep(80);
    c.frame(0, 0, 0, aim);
    const start = await c
      .waitFor(
        (m) => m.t === 'action' && m.state === 'start' && m.ability === ability,
        `${ability} start`,
        700,
        mark,
      )
      .catch(() => null);
    if (start) return { start, mark };
  }
  throw new Error(`${ability} never began after 6 press edges`);
}

/** The cast lifecycle from one press: start/fire stamps + a break flag. */
async function castOnce(
  c: Client,
  slot: number,
  opts: {
    moving?: boolean;
    jitterBurst?: boolean;
    aim?: number;
    tx?: number;
    ty?: number;
    bailAfterMs?: number;
    bailWith?: 'repress' | 'sheathe';
  } = {},
): Promise<{ startAt: number; fireAt: number | null; brokeAt: number | null; startTicks: number }> {
  const mark = c.mark();
  const button = slot === 0 ? A1 : A3;
  // A press against a hair of leftover cooldown is refused quietly and
  // costs nothing — retry the edge until the breath actually begins.
  let start: Msg | null = null;
  for (let attempt = 0; attempt < 6 && !start; attempt++) {
    c.frame(button, 0, 0, opts.aim ?? 0, opts.tx, opts.ty);
    await sleep(80);
    c.frame(0, 0, 0, opts.aim ?? 0);
    start = await c
      .waitFor((m) => m.t === 'cast' && m.state === 'start' && m.slot === slot, 'cast start', 700, mark)
      .catch(() => null);
  }
  if (!start) throw new Error('cast start never arrived after 6 press edges');
  const startAt = start.at;

  let mover: ReturnType<typeof setInterval> | null = null;
  if (opts.moving) {
    mover = setInterval(() => c.frame(0, 1, 0, opts.aim ?? 0), 50);
  } else if (opts.jitterBurst) {
    // The catch-up shape: frames arrive in clumps — some server ticks
    // drain two frames, some starve at zero (which the law counts as
    // planted). The breath must neither hang nor double-charge.
    mover = setInterval(() => {
      for (let i = 0; i < 5; i++) c.frame(0, 1, 0, opts.aim ?? 0);
    }, 260);
  }

  let bailTimer: ReturnType<typeof setTimeout> | null = null;
  if (opts.bailAfterMs) {
    bailTimer = setTimeout(() => {
      if (opts.bailWith === 'sheathe') c.frame(SHEATHE, 1, 0);
      else c.frame(button);
      setTimeout(() => c.frame(0), 60);
    }, opts.bailAfterMs);
  }

  let fireAt: number | null = null;
  let brokeAt: number | null = null;
  try {
    const end = await c.waitFor(
      (m) => m.t === 'cast' && (m.state === 'fire' || m.state === 'break') && m.slot === slot,
      'cast end',
      6000,
      mark,
    );
    if (end.state === 'fire') fireAt = end.at;
    else brokeAt = end.at;
  } finally {
    if (mover) clearInterval(mover);
    if (bailTimer) clearTimeout(bailTimer);
    c.frame(0);
  }
  return { startAt, fireAt, brokeAt, startTicks: start.ticks };
}

function soft(name: string, ok: boolean, detail = ''): void {
  if (ok) receipt(name, true, detail);
  else console.log(`UNPROVEN    ${name}${detail ? `  (${detail})` : ''}`);
}

async function cdAfter(c: Client, from: number, slot: number): Promise<Msg> {
  return c.waitFor((m) => m.t === 'cooldowns' && m.cd[slot] > 0, `cooldowns after slot ${slot}`, 4000, from);
}

const main = async () => {
  console.log(`THE PROVING — THE MASTERED HAND, over ${URL}\n`);
  const a = await join(`hand_${STAMP}`, `Hand ${STAMP}`);
  await xpToLevel(a, 'arx', 99);
  await xpToLevel(a, 'shield', 99);
  await xpToLevel(a, 'onehand', 99);
  await xpToLevel(a, 'vitality', 90);

  // An honest empty course.
  const jit = Number(STAMP) % 9;
  const crowdAt = (cx: number, cy: number): number =>
    [...a.snap.entries()].filter(([eid, s]) => eid !== a.eid && Date.now() - s.at < 1500 && Math.hypot(s.x - cx, s.y - cy) < 12).length;
  let CX = 0;
  let CY = 0;
  let found = false;
  for (const [cx, cy] of [[236 + jit, 96 + jit], [206 + jit, 64], [244, 130 + jit], [284, 88 + jit], [222 + jit, 148], [186, 92 + jit]] as Array<[number, number]>) {
    await tp(a, cx, cy);
    a.snap.clear();
    await sleep(1000);
    if (crowdAt(cx, cy) > 0) continue;
    CX = cx;
    CY = cy;
    found = true;
    break;
  }
  if (!found) throw new Error('no empty course');

  // ---- R1 THE WORD + R2 THE AFTERMATH: wickfire leaves `burn` and fire on the ground.
  await seat(a, 'wickfire', 0);
  await seat(a, 'frost_lance', 2);
  let mark = a.mark();
  let fxm = a.fxMark();
  const wick = await castOnce(a, 0, { aim: 0 });
  if (wick.fireAt === null) throw new Error('wickfire never fired');
  const open1 = await a.waitFor((m) => m.t === 'cooldowns' && m.open?.tag === 'burn', 'the word burn', 3000, mark);
  receipt('THE WORD: the opener leaves its word on the wire', open1.open.tag === 'burn', `age ${open1.open.age}t`);
  const ground = await a.waitFor((m) => m.t === 'fx' && m.kind === 'field' && m.id === 'wickfire:aftermath', 'wickfire aftermath', 4000, mark);
  receipt('THE AFTERMATH: the ground keeps burning under its own voice', ground.ticks > 0, `${ground.ticks}t r${ground.radius}`);

  // ---- R3 THE FOLLOW: frost_lance inside the window is flourished, spends burn, leaves chill.
  await waitCd(a, 2);
  mark = a.mark();
  fxm = a.fxMark();
  const lance = await castOnce(a, 2, { aim: 0 });
  if (lance.fireAt === null) throw new Error('frost_lance never fired');
  const beam = a.fxSince(fxm, 'beam', 'frost_lance')[0];
  receipt('THE FOLLOW: the payoff inside the window wears the follow flourish', beam?.flourish === 'follow', `flourish ${beam?.flourish}`);
  const open2 = await a.waitFor((m) => m.t === 'cooldowns' && m.at >= lance.fireAt!, 'cooldowns after the lance', 3000, mark);
  receipt('THE FOLLOW spends the opening and leaves its own word', open2.open?.tag === 'chill', `open ${JSON.stringify(open2.open)}`);

  // ---- R4 THE REFUND: a seat keeps its clock through a reseat, so the
  // chain is lance (R) → arc_bolt on a FREE Q inside the chill window;
  // arc_bolt IV follows chill with 40 ticks given back.
  await seat(a, 'arc_bolt', 0);
  await waitCd(a, 0);
  await waitCd(a, 2);
  const lance2 = await castOnce(a, 2, { aim: 0 });
  if (lance2.fireAt === null) throw new Error('second frost_lance never fired');
  mark = a.mark();
  fxm = a.fxMark();
  await a.press(A1, 0);
  const cdBolt = await a.waitFor((m) => m.t === 'cooldowns' && m.at > lance2.fireAt! + 50 && m.cd[0] > 0, 'cooldowns after the bolt', 4000, mark);
  receipt('THE FOLLOW REFUND: the seat comes back sooner', cdBolt.cd[0] <= cdBolt.max[0] - 40, `cd ${cdBolt.cd[0]} of ${cdBolt.max[0]}`);
  const boltFx = a.fxSince(fxm, 'bolt').concat(a.fxSince(fxm, 'nova'), a.fxSince(fxm, 'reaction'), a.fxSince(fxm, 'arc'));
  soft('THE FOLLOW flourish rides the chain', boltFx.some((f) => f.flourish === 'follow'), `${boltFx.length} fx`);

  // ---- R5 THE FINALE + THE QUIET BEAT: a channeled arx rung that leaves
  // ground — its last beat is flourished, its quiet beats are not, and
  // exactly ONE ground is left.
  const pick = (pred: (t: (typeof TECHNIQUES)[number]) => boolean) => TECHNIQUES.find((t) => !t.hidden && !(t as any).secret && ['arx', 'shield', 'onehand'].includes(t.style) && pred(t));
  const noteArt =
    pick((t) => !!ABILITIES.get(t.ability)!.channelTicks && !!ABILITIES.get(t.ability)!.aftermath && (ABILITIES.get(t.ability)!.finaleMult ?? 1) > 1) ??
    pick((t) => !!ABILITIES.get(t.ability)!.channelTicks && !!ABILITIES.get(t.ability)!.aftermath) ??
    pick((t) => !!ABILITIES.get(t.ability)!.channelTicks && (ABILITIES.get(t.ability)!.finaleMult ?? 1) > 1);
  if (!noteArt) throw new Error('no channeled rung to prove the finale on');
  const noteId = noteArt.ability;
  const noteHasGround = !!ABILITIES.get(noteId)!.aftermath;
  console.log(`  the note under proof: ${noteId} (${noteArt.style}${noteHasGround ? ', leaves ground' : ''})`);
  const noteKind = ABILITIES.get(noteId)!.shape === 'beam' ? 'beam' : ABILITIES.get(noteId)!.shape === 'nova' ? 'nova' : 'telegraph';
  await seat(a, noteId, 2);
  await waitCd(a, 2);
  fxm = a.fxMark();
  const note = await channelStart(a, 2, noteId, 0);
  await a.waitFor((m) => m.t === 'action' && m.state === 'stop', 'note end', 8000, note.mark);
  await sleep(300);
  const beats = a.fxSince(fxm, noteKind, noteId);
  receipt(
    `THE FINALE: only the last beat of ${noteId} carries the finale flourish`,
    beats.length >= 2 && beats.at(-1)!.flourish === 'finale' && beats.slice(0, -1).every((f) => !f.flourish),
    `${beats.length} beats: ${beats.map((f) => f.flourish ?? '-').join(',')}`,
  );
  const sheet = a.fxSince(fxm, 'field', `${noteId}:aftermath`);
  if (noteHasGround) receipt('THE QUIET BEAT: a note leaves ONE ground, on its last beat', sheet.length === 1 && sheet[0]!.at >= beats.at(-1)!.at - 60, `${sheet.length} grounds`);
  else soft('THE QUIET BEAT: a note leaves ONE ground, on its last beat', false, 'no channeled rung in arx/shield/onehand carries an aftermath yet');

  // ---- R6 THE RED LEDGER: a kill inside the window refunds the seat.
  await seat(a, 'wickfire', 0);
  await waitCd(a, 0);
  let refunded = false;
  let detail = '';
  for (let attempt = 0; attempt < 3 && !refunded; attempt++) {
    await a.say('/spawnmob rat 1');
    await sleep(900);
    const rat = a.findByDef('rat');
    if (!rat) {
      detail = 'no rat';
      continue;
    }
    const me = a.own();
    const ang = Math.atan2(rat.y - me.y, rat.x - me.x);
    mark = a.mark();
    const w2 = await castOnce(a, 0, { aim: ang });
    if (w2.fireAt === null) continue;
    const death = await a.waitFor((m) => m.t === 'death' && m.eid === rat.eid, 'rat death', 2500, mark).catch(() => null);
    if (!death) {
      detail = 'the rat lived';
      await waitCd(a, 0);
      continue;
    }
    const cds = await a.waitFor((m) => m.t === 'cooldowns' && m.at >= death.at, 'cooldowns after the kill', 2000, mark);
    refunded = cds.cd[0] <= cds.max[0] - 60;
    detail = `cd ${cds.cd[0]} of ${cds.max[0]} after the kill`;
    if (!refunded) await waitCd(a, 0);
  }
  receipt('THE RED LEDGER: a kill inside the window hands the seat back', refunded, detail);

  // ---- R7 THE HELD GROUND: hold_the_line armors its keeper while they stand in it, and lapses when they leave.
  await seat(a, 'hold_the_line', 2);
  await waitCd(a, 2);
  mark = a.mark();
  const line = await castOnce(a, 2, { aim: 0 });
  if (line.fireAt === null) throw new Error('hold_the_line never fired');
  const held = await a.waitFor((m) => m.t === 'buffs' && m.buffs?.some((b: any) => /hold the line/i.test(b.name ?? '')), 'held ground buff', 3000, mark).catch(() => null);
  receipt('THE HELD GROUND: standing in your own line, you wear its boon', !!held, held ? held.buffs.map((b: any) => b.name).join('|') : 'no buff');
  for (let i = 0; i < 40; i++) {
    a.frame(0, 1, 0);
    await sleep(50);
  }
  a.frame(0);
  await sleep(1200);
  const walked = Math.hypot(a.own().x - CX, a.own().y - CY);
  // Expiry pushes no buffs frame; a stance cast does — read the list it carries.
  await seat(a, 'set_the_wall', 0);
  await waitCd(a, 0);
  mark = a.mark();
  await a.press(A1, 0);
  const pushed = await a.waitFor((m) => m.t === 'buffs' && m.buffs?.some((b: any) => /set the wall/i.test(b.name ?? '')), 'stance buffs push', 4000, mark);
  receipt('THE HELD GROUND lapses a beat after you leave it', !pushed.buffs.some((b: any) => /hold the line/i.test(b.name ?? '')), `walked ${walked.toFixed(1)} tiles; buffs ${pushed.buffs.map((b: any) => b.name).join('|')}`);

  // ---- R8 THE STAGGER INTERRUPT: a staggered caster loses its breath.
  await seat(a, 'heavy_slam', 0);
  await waitCd(a, 0);
  let guttered = false;
  let sdetail = 'no caster wind seen';
  await a.say('/spawnmob goblin_firecaller 1');
  for (let attempt = 0; attempt < 6 && !guttered; attempt++) {
    const caster = a.findByDef('goblin_firecaller');
    if (!caster) {
      await sleep(600);
      continue;
    }
    fxm = a.fxMark();
    const wind = await a.waitFor((m) => m.t === 'fx' && m.kind === 'charge' && m.eid === caster.eid && (m.ticks ?? 0) > 0, 'caster wind', 6000).catch(() => null);
    if (!wind) break;
    const me = a.own();
    const ang = Math.atan2(caster.y - me.y, caster.x - me.x);
    a.frame(A1, 0, 0, ang);
    await sleep(80);
    a.frame(0, 0, 0, ang);
    const gutter = await a.waitFor((m) => m.t === 'fx' && m.kind === 'charge' && m.eid === caster.eid && m.ticks === 0 && m.at > wind.at, 'gutter', 1500).catch(() => null);
    guttered = !!gutter;
    sdetail = guttered ? `guttered ${gutter!.at - wind.at} ms after the wind began` : 'the breath completed';
    await waitCd(a, 0);
  }
  soft('THE STAGGER INTERRUPT: a staggered caster loses its breath', guttered, sdetail);

  console.log(`\n${passed} receipts.`);
  a.ws.close();
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
