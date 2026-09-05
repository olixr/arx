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
import {
  ByteReader,
  BinaryMsgType,
  decodeSnapshot,
  PROTOCOL_VERSION,
  PoseState,
} from '@arx/shared';

const URL = process.env.PROVE_URL ?? 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));

type Msg = Record<string, any>;
const ATTACK = 1 << 0;
const A1 = 1 << 3; // Q — technique seat 0
const A3 = 1 << 5; // R — technique seat 2
const SHEATHE = 1 << 9; // H — the canonical bail-out press

// The clocks under proof (content truths, pinned here on purpose —
// a def drift that changes a clock should FAIL the proving).
const DAYBREAK_TICKS = 24; // 1200 ms full stride, 1000 ms planted
// The proving body casts at level ~96, so POOL arts (rung arts and
// deed pages) speak their RANK IV numbers — but a loaned secret casts
// at RANK I until mastered (seatAbility's loan law). Both truths are
// pinned below exactly as the wire speaks them.
const FULL_DRAW_TICKS = 30; // a LOANED secret: rank I until mastered
const MAELSTROM_TICKS = 48; // 2400 ms, a beat every 16
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

const main = async () => {
  console.log(`THE PROVING — THE DRAWN BREATH, over ${URL}\n`);
  const a = await join(`breath_${STAMP}`, `Breath ${STAMP}`);
  const b = await join(`watch_${STAMP}`, `Watch ${STAMP}`);
  b.watchEid = a.eid;
  // The hearth ground is the one spot always known walkable — the
  // champion brawl's panic refuge.
  const HOME = { x: Math.round(a.own().x), y: Math.round(a.own().y) };

  // The schools this proving casts from. arx 50 opens daybreak; the
  // rest open the teachers' doors and the deed weapons. Vitality is
  // the proving body's armor: max HP IS the vitality level, and a
  // ten-point starter pool dies to two wolves mid-receipt.
  await xpToLevel(a, 'arx', 50);
  await xpToLevel(a, 'twohand', 45);
  await xpToLevel(a, 'onehand', 30);
  await xpToLevel(a, 'archery', 45);
  await xpToLevel(a, 'vitality', 90);

  // Open ground, both bodies. The course jitters per run so leashed
  // proving mobs never collect across reruns — and every candidate is
  // VETTED: the moving receipts run due east, so the eastern runway
  // must be plain dirt (no walls to plant against, no portal mouth to
  // swallow the runner mid-breath).
  const jit = Number(STAMP) % 9;
  let CX = 0;
  let CY = 0;
  let courseFound = false;
  /** Anything alive (not us) within reach of the course center. */
  const crowdAt = (cx: number, cy: number): number =>
    [...a.snap.entries()].filter(
      ([eid, s]) =>
        eid !== a.eid &&
        eid !== b.eid &&
        Date.now() - s.at < 1500 &&
        Math.hypot(s.x - cx, s.y - cy) < 12,
    ).length;
  for (const [cx, cy] of [
    [236 + jit, 96 + jit],
    [206 + jit, 64],
    [244, 130 + jit],
    [284, 88 + jit],
    [222 + jit, 148],
    [186, 92 + jit],
    [252 + jit, 62],
    [304, 128 + jit],
  ] as Array<[number, number]>) {
    await tp(a, cx, cy);
    a.snap.clear();
    await sleep(1000);
    // A wild pack resident on the course kills receipts (and bodies).
    if (crowdAt(cx, cy) > 0) continue;
    const r0 = a.own();
    for (let i = 0; i < 26; i++) {
      a.frame(0, 1, 0);
      await sleep(50);
    }
    a.frame(0);
    await sleep(300);
    const r1 = a.own();
    const ran = Math.hypot(r1.x - r0.x, r1.y - r0.y);
    if (!(ran > 4.5 && ran < 9)) continue;
    // The probe itself may have dragged something home — look again.
    await tp(a, cx, cy);
    a.snap.clear();
    await sleep(800);
    if (crowdAt(cx, cy) > 0) continue;
    CX = cx;
    CY = cy;
    courseFound = true;
    break;
  }
  if (!courseFound) throw new Error('no honest empty runway found for the moving receipts');
  await tp(b, CX + 2, CY + 1);
  await sleep(400);

  // ================================================================
  // S1 — THE DRAWN BREATH: the two clocks, the pay door, the bails.
  // ================================================================
  await seat(a, 'daybreak', 0);

  // --- The planted breath (no strides, lag ticks count as planted).
  let mark = a.mark();
  const planted = await castOnce(a, 0);
  receipt('the breath begins on the wire with its authored clock', planted.startTicks === DAYBREAK_TICKS, `ticks ${planted.startTicks}`);
  if (planted.fireAt === null) throw new Error('planted breath never fired');
  const plantedDt = planted.fireAt - planted.startAt;
  receipt(
    'a planted breath fires on the quickened clock',
    plantedDt >= plantedMs(DAYBREAK_TICKS) - 160 && plantedDt <= plantedMs(DAYBREAK_TICKS) + 140,
    `${plantedDt} ms (law ${plantedMs(DAYBREAK_TICKS)})`,
  );
  // --- Pay-at-fire: no cooldown word before the fire, one at/after it.
  await sleep(300); // the cooldown word may ride the batch after the fire
  const windowMsgs = a.msgs.slice(mark);
  const fireIdx = windowMsgs.findIndex((m) => m.t === 'cast' && m.state === 'fire');
  const paidEarly = windowMsgs.slice(0, fireIdx).some((m) => m.t === 'cooldowns' && m.cd?.[0] > 0);
  const paidAtFire = windowMsgs.slice(fireIdx).some((m) => m.t === 'cooldowns' && m.cd?.[0] > 0);
  receipt('the wind-up pays nothing until the fire', !paidEarly && paidAtFire);

  // --- The full-stride breath, watched: the gather trails the body.
  await waitCd(a, 0);
  const beforeMove = a.own();
  let bFx = b.fxMark();
  const moving = await castOnce(a, 0, { moving: true });
  if (moving.fireAt === null) throw new Error('moving breath never fired');
  const movingDt = moving.fireAt - moving.startAt;
  receipt(
    'a full-stride breath fires on the long clock',
    movingDt >= DAYBREAK_TICKS * TICK_MS - 140 && movingDt <= DAYBREAK_TICKS * TICK_MS + 200,
    `${movingDt} ms (law ${DAYBREAK_TICKS * TICK_MS})`,
  );
  await sleep(250);
  const afterMove = a.own();
  const strode = Math.hypot(afterMove.x - beforeMove.x, afterMove.y - beforeMove.y);
  receipt('the body kept its full stride through the wind-up', strode > 3, `${strode.toFixed(1)} tiles`);
  receipt(
    'planted beats moving by the law\'s own margin',
    movingDt - plantedDt >= 110,
    `${movingDt - plantedDt} ms quicker planted`,
  );
  // The watcher heard the charge dialect follow the running body.
  const charges = b.fxSince(bFx, 'charge', 'daybreak');
  receipt('the charge gathers on the winding body, wide first', charges.length >= 2 && charges[0]!.radius === 1.5, `${charges.length} gathers`);
  const contracting = charges.every((f, i) => i === 0 || f.radius <= charges[i - 1]!.radius + 1e-9);
  const trailed = Math.abs(charges[charges.length - 1]!.x - charges[0]!.x) > 1.5;
  receipt('the gather trails the runner and tightens toward the fire', contracting && trailed && charges[charges.length - 1]!.radius < 1.5);

  // --- The bails: nothing spent, ever.
  await waitCd(a, 0);
  mark = a.mark();
  const repress = await castOnce(a, 0, { bailAfterMs: 350, bailWith: 'repress' });
  receipt('the second press lets the breath go, unspent', repress.brokeAt !== null && repress.fireAt === null);
  let spent = a.msgs.slice(mark).some((m) => m.t === 'cooldowns' && m.cd?.[0] > 0);
  receipt('a re-pressed breath costs nothing', !spent);

  mark = a.mark();
  // The sheathe press is the canonical bail-out now (the button dodge
  // retired 2026-09-05): steel away, breath let go, nothing spent.
  const stowed = await castOnce(a, 0, { moving: true, bailAfterMs: 400, bailWith: 'sheathe' });
  receipt('the sheathe bails the breath out clean', stowed.brokeAt !== null && stowed.fireAt === null);
  spent = a.msgs.slice(mark).some((m) => m.t === 'cooldowns' && m.cd?.[0] > 0);
  receipt('a sheathed-out breath costs nothing', !spent);

  // --- The catch-up shape: clumped frames, the breath keeps its truth.
  const jittered = await castOnce(a, 0, { jitterBurst: true });
  if (jittered.fireAt === null) throw new Error('jittered breath never fired');
  const jitterDt = jittered.fireAt - jittered.startAt;
  receipt(
    'a stuttering hand keeps its breath (0- and 2-frame ticks)',
    jitterDt >= plantedMs(DAYBREAK_TICKS) - 160 && jitterDt <= DAYBREAK_TICKS * TICK_MS + 260,
    `${jitterDt} ms, inside [planted, full-stride]`,
  );

  // ================================================================
  // S2 — THE VISIBLE WORKING: the staked mark, watched from beside.
  // ================================================================
  await waitCd(a, 0);
  const me = a.own();
  bFx = b.fxMark();
  const staked = await castOnce(a, 0, { tx: me.x + 6, ty: me.y });
  if (staked.fireAt === null) throw new Error('staked breath never fired');
  await sleep(300);
  const marks = b.fxSince(bFx, 'telegraph', 'daybreak');
  receipt(
    'the staked breath telegraphs its landing on the planted clock',
    marks.length >= 2 && marks[0]!.ticks === Math.ceil(DAYBREAK_TICKS / CAST_STILL_FACTOR),
    `wind mark ${marks[0]?.ticks} ticks`,
  );
  const gap = marks.length >= 2 ? marks[1]!.at - marks[0]!.at : 0;
  receipt('the mark never lies early: the blast waits out the whole wind', gap >= plantedMs(DAYBREAK_TICKS) - 160, `${gap} ms to the fuse mark`);

  // --- The broken staked breath gutters its mark unfired.
  await waitCd(a, 0);
  bFx = b.fxMark();
  const gutter = await castOnce(a, 0, { tx: me.x + 6, ty: me.y, bailAfterMs: 400, bailWith: 'repress' });
  receipt('the broken breath lets go before the mark', gutter.brokeAt !== null);
  await sleep(1800);
  const afterBreak = b.fxSince(bFx, 'telegraph', 'daybreak');
  receipt(
    'a guttered mark never blossoms: one telegraph, no blast behind it',
    afterBreak.length === 1,
    `${afterBreak.length} telegraph(s) seen`,
  );

  // ================================================================
  // S3 — THE HELD NOTE: beats, hums, pose, breaks, forfeits.
  // ================================================================
  // The strides of S1 carried the caster off — stand the pair back
  // together so the watcher's snapshot interest holds the whole note.
  await tp(a, CX, CY);
  await tp(b, CX + 2, CY + 1);
  await sleep(400);
  await seat(a, 'maelstrom', 2);
  let aFx = a.fxMark();
  bFx = b.fxMark();
  mark = a.mark();
  const meNow = a.own();
  // The watcher's read of the caster, polled through the whole note —
  // delta snapshots only carry a body when it changes, so the LATEST
  // sample is the watcher's truth at any moment.
  const posesSeen = new Set<number>();
  const poseSampler = setInterval(() => {
    const s = b.snap.get(b.watchEid);
    if (s) posesSeen.add(s.pose);
  }, 80);
  const ns = await channelStart(a, 2, 'maelstrom', 0, meNow.x + 5, meNow.y);
  const noteStart = ns.start;
  mark = ns.mark;
  const noteStartAt = noteStart.at;
  receipt('the note starts on the one rail, named for the bar', noteStart.ticks === MAELSTROM_TICKS && noteStart.slot === 2);
  const paid = await a.waitFor((m) => m.t === 'cooldowns' && m.cd?.[2] > 0, 'note paid', 1200, mark);
  receipt('the note pays its whole price at the first beat', paid.cd[2] > 200, `cd ${paid.cd[2]} ticks at start`);
  const noteStop = await a.waitFor((m) => m.t === 'action' && m.state === 'stop', 'note done', 4000, mark);
  clearInterval(poseSampler);
  const noteDt = Date.now() - noteStartAt;
  receipt('the note ends on its own clock, reason done', noteStop.reason === 'done' && noteDt > MAELSTROM_TICKS * TICK_MS - 300, `${noteDt} ms`);
  await sleep(200);
  const beatMarks = a.fxSince(aFx, 'telegraph', 'maelstrom');
  receipt('the note pulses its shape on the beat', beatMarks.length >= 3, `${beatMarks.length} beats of ${1 + Math.floor((MAELSTROM_TICKS - 1) / 16)}`);
  const hums = b.fxSince(bFx, 'note', 'maelstrom');
  receipt('the held note hums to the watcher between beats', hums.length >= 3, `${hums.length} hums`);
  receipt(
    'the watcher reads the held pose for the whole note',
    posesSeen.has(PoseState.Art),
    `poses seen [${[...posesSeen].join(', ')}]`,
  );

  // --- A step breaks the note; the rest is forfeit.
  await waitCd(a, 2);
  mark = (await channelStart(a, 2, 'maelstrom', 0, meNow.x + 5, meNow.y)).mark;
  await sleep(500);
  a.frame(0, 1, 0);
  const moveBreak = await a.waitFor((m) => m.t === 'action' && m.state === 'stop', 'move break', 2000, mark);
  a.frame(0);
  receipt('a step breaks the note', moveBreak.reason === 'moved', `reason '${moveBreak.reason}'`);
  const refunded = a.msgs.slice(mark).some((m) => m.t === 'cooldowns' && m.cd?.[2] === 0);
  receipt('the broken note forfeits — the price stays paid', !refunded);

  // --- Damage never breaks the note (wolves chew, the sea holds).
  await waitCd(a, 2);
  // The wolves join us ON the vetted course — every unvetted offset
  // this receipt ever visited found either no teeth or too many.
  const hp0 = a.own().hpPct;
  await a.say('/spawnmob wolf 1');
  // The receipt needs teeth IN the body before the note begins — wait
  // for a FRESH bite (walking into the pack if they hang back), then
  // sing through the chewing.
  let bitten = false;
  for (let approach = 0; approach < 4 && !bitten; approach++) {
    const t0 = Date.now();
    while (Date.now() - t0 < 5000) {
      if (a.own().hpPct < hp0) {
        bitten = true;
        break;
      }
      await sleep(200);
    }
    if (!bitten) {
      const wolf = a.findByDef('wolf');
      const meB = a.own();
      if (wolf) {
        const ang = Math.atan2(wolf.y - meB.y, wolf.x - meB.x);
        for (let i = 0; i < 8; i++) {
          a.frame(0, Math.cos(ang), Math.sin(ang));
          await sleep(50);
        }
        a.frame(0);
      } else {
        await a.say('/spawnmob wolf 1');
      }
    }
  }
  if (!bitten) throw new Error('the wolves never bit — nothing to prove against');
  const hurtBefore = a.own().hpPct;
  const meW = a.own();
  mark = (await channelStart(a, 2, 'maelstrom', 0, meW.x + 6, meW.y)).mark; // staked away — the drain spares the wolves
  const dmgStop = await a.waitFor((m) => m.t === 'action' && m.state === 'stop', 'note 3 end', 5000, mark);
  const hurtAfter = a.own().hpPct;
  receipt(
    'damage never breaks the note',
    dmgStop.reason === 'done' && hurtAfter < hurtBefore,
    `hp ${hurtBefore} -> ${hurtAfter}, reason '${dmgStop.reason}'`,
  );
  // The pack stays — bites cannot break the receipts that follow, and
  // the deed's great steel will answer them soon enough.

  // --- Re-pressing the singing slot ends it early, price kept.
  await waitCd(a, 2);
  const meR = a.own();
  mark = (await channelStart(a, 2, 'maelstrom', 0, meR.x + 5, meR.y)).mark;
  await sleep(500);
  await a.press(A3);
  const repressStop = await a.waitFor((m) => m.t === 'action' && m.state === 'stop', 'repress stop', 2000, mark);
  receipt('re-pressing the singing slot ends the note, price kept', repressStop.reason === 'cancelled', `reason '${repressStop.reason}'`);

  // ================================================================
  // S4 — THE RECONNECT: a dropped hand lets the note go, cleanly.
  // ================================================================
  await waitCd(a, 2);
  bFx = b.fxMark();
  const meD = a.own();
  mark = (await channelStart(a, 2, 'maelstrom', 0, meD.x + 5, meD.y)).mark;
  await sleep(600);
  const closedAt = Date.now();
  a.ws.close();
  await sleep(2400); // the note's whole natural remainder
  const ghostBeats = b
    .fxSince(bFx, 'telegraph', 'maelstrom')
    .concat(b.fxSince(bFx, 'note', 'maelstrom'))
    .filter((f) => f.at > closedAt + 350);
  receipt(
    'the dropped hand lets the note go — no unpiloted beats',
    ghostBeats.length === 0,
    `${ghostBeats.length} ghost beat(s) after the drop`,
  );
  const a2 = await join(`breath_${STAMP}`, '', false);
  b.watchEid = a2.eid;
  const rejoinAt = Date.now();
  const rejoinFx = b.fxMark();
  // Stand perfectly still through the note's whole natural remainder:
  // a grace-frozen channel that RESUMED on rebind would pulse its
  // beats barless into this window and speak an orphan stop.
  await sleep(2400);
  const orphanActions = a2.msgs.filter((m) => m.t === 'action');
  const resumedBeats = b
    .fxSince(rejoinFx, 'telegraph', 'maelstrom')
    .concat(b.fxSince(rejoinFx, 'note', 'maelstrom'))
    .filter((f) => f.at > rejoinAt);
  receipt(
    'the note never resumes barless into the reconnected client',
    orphanActions.length === 0 && resumedBeats.length === 0,
    `${orphanActions.length} orphan action word(s), ${resumedBeats.length} resumed beat(s)`,
  );
  const p0 = a2.own();
  for (let i = 0; i < 10; i++) {
    a2.frame(0, 1, 0);
    await sleep(50);
  }
  a2.frame(0);
  await sleep(300);
  const p1 = a2.own();
  receipt(
    'the returning body stands free and answers at once',
    Math.hypot(p1.x - p0.x, p1.y - p0.y) > 0.5,
    `moved ${Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(2)} tiles`,
  );

  // ================================================================
  // S5 — THE DEEDS: both unwritten pages, earned the true way.
  // ================================================================
  // The deeds fight on the VETTED course — the rejoin spot was never
  // swept, and wild packs have killed proving bodies on it.
  await tp(a2, CX, CY);
  await tp(b, CX + 2, CY + 1);
  await sleep(300);
  // The whirlwind's deed: three felled by ONE turn of the great steel.
  await give(a2, 'kerbstone');
  await equipFromPack(a2, 'kerbstone');
  let ceremony: Msg | null = null;
  for (let attempt = 0; attempt < 4 && !ceremony; attempt++) {
    await a2.say('/spawnmob chicken 8');
    await sleep(900);
    for (let swing = 0; swing < 10 && !ceremony; swing++) {
      // Aim where the crowd is thickest.
      const meS = a2.own();
      const flock: Array<{ x: number; y: number }> = [];
      for (const [eid, def] of a2.defIds) {
        if (def !== 'chicken') continue;
        const s = a2.snap.get(eid);
        if (s && Date.now() - s.at < 1200 && Math.hypot(s.x - meS.x, s.y - meS.y) < 2.4) flock.push(s);
      }
      let aim = 0;
      let bestCount = 0;
      for (const c of flock) {
        const ang = Math.atan2(c.y - meS.y, c.x - meS.x);
        const count = flock.filter((o) => {
          let d = Math.abs(Math.atan2(o.y - meS.y, o.x - meS.x) - ang) % (Math.PI * 2);
          if (d > Math.PI) d = Math.PI * 2 - d;
          return d < 1.1;
        }).length;
        if (count > bestCount) {
          bestCount = count;
          aim = ang;
        }
      }
      const sm = a2.mark();
      await a2.press(ATTACK, aim);
      await sleep(500);
      ceremony =
        (a2.msgs
          .slice(sm)
          .find((m) => m.t === 'chat' && /unwritten page fills itself: Whirling Ruin/.test(m.text ?? '')) as Msg) ?? null;
    }
  }
  receipt('three felled by one turn of the great steel — the page fills', ceremony !== null);
  const earned1 = await a2.waitFor((m) => m.t === 'techniques' && m.earned?.includes('whirling_ruin'), 'whirling earned', 4000);
  receipt('the whirlwind rides the earned wire', !!earned1);

  // The spin itself: the whole held turn on the rail. (R may still
  // carry the reconnect note's cooldown — a fast deed beats 13 s.)
  await seat(a2, 'whirling_ruin', 2);
  await waitCd(a2, 2);
  aFx = a2.fxMark();
  const sp = await channelStart(a2, 2, 'whirling_ruin');
  const spinStart = sp.start;
  mark = sp.mark;
  const spinStop = await a2.waitFor((m) => m.t === 'action' && m.state === 'stop', 'spin end', 6000, mark);
  receipt(
    'the whirlwind spins its whole held turn (rank IV refuses to sit down)',
    spinStart.ticks === 70 && spinStop.reason === 'done',
    `${spinStart.ticks} ticks held`,
  );

  // The receipts' pet wolves still prowl the course — the champion
  // bout cannot share its arena with a chewing pack. The great steel
  // sweeps the ground clear first.
  for (let sweep = 0; sweep < 30; sweep++) {
    const wolf = a2.findByDef('wolf');
    if (!wolf) break;
    const meS = a2.own();
    const dw = Math.hypot(wolf.x - meS.x, wolf.y - meS.y);
    if (dw > 1.8) {
      const ang = Math.atan2(wolf.y - meS.y, wolf.x - meS.x);
      for (let i = 0; i < 6; i++) {
        a2.frame(0, Math.cos(ang), Math.sin(ang));
        await sleep(50);
      }
      a2.frame(0);
      continue;
    }
    await a2.press(ATTACK, Math.atan2(wolf.y - meS.y, wolf.x - meS.x));
    await sleep(300);
  }

  // The winter-caller's deed: a champion felled by the arx hand while
  // winter is on it. The staff hand does the whole fight — the great
  // steel goes away so no OTHER page can claim the kill.
  await give(a2, 'candlewake');
  await xpToLevel(a2, 'arx', 50); // idempotent — the relog kept it
  await equipFromPack(a2, 'candlewake');
  // The rotation that keeps winter ON the body through the killing
  // blow (probe-proven): the lance re-chills every cycle (rank IV
  // holds 5 s of its 8 s cooldown) and the sea's beats land on a
  // lanced body — whichever art rolls the death, winter owns it.
  await seat(a2, 'maelstrom', 0);
  await seat(a2, 'frost_lance', 2);
  const wm = a2.mark();
  let winterCeremony: Msg | null = null;
  const winterSaid = () =>
    (a2.msgs
      .slice(wm)
      .find((m) => m.t === 'chat' && /unwritten page fills itself: Winter's Fall/.test(m.text ?? '')) as Msg) ?? null;
  // Up to three champions answer — the deed needs the chill ON at the
  // killing blow, and an unlucky kill can land on a lapsed chill.
  for (let bout = 0; bout < 3 && !winterCeremony; bout++) {
    await a2.say('/spawnmob skeleton_champion 1');
    await sleep(1200);
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline && !winterCeremony) {
      const meC = a2.own();
      // The brawl is affordable at vitality 90, but never reckless:
      // under 40% the body steps out of the story entirely.
      if (meC.hpPct < 140) {
        // Step out of the story entirely: the hearth ground is the one
        // refuge always walkable, and the champion leashes home.
        await tp(a2, HOME.x, HOME.y);
        await sleep(4000);
        await tp(a2, CX, CY);
        await sleep(600);
      }
      const champ = a2.findByDef('skeleton_champion');
      if (!champ) {
        await sleep(500);
        winterCeremony = winterSaid();
        if (!winterCeremony) break; // this champion died unchilled — call the next
        continue;
      }
      const d = Math.hypot(champ.x - meC.x, champ.y - meC.y);
      if (d > 14) {
        // He leashed home — stand back on the course and let him come.
        await tp(a2, CX, CY);
        await sleep(2000);
        continue;
      }
      if (d > 3.5) {
        // Walk to him — the sea needs him inside its ring.
        const ang = Math.atan2(champ.y - meC.y, champ.x - meC.x);
        a2.frame(0, Math.cos(ang), Math.sin(ang));
        await sleep(250);
        a2.frame(0);
        continue;
      }
      // Winter first, winter always: the lance re-chills every cycle,
      // then the sea's staked beats land on a lanced body.
      const aimCh = Math.atan2(champ.y - meC.y, champ.x - meC.x);
      a2.frame(A3, 0, 0, aimCh);
      await sleep(120);
      a2.frame(0, 0, 0, aimCh);
      await sleep(250);
      try {
        const c2 = a2.findByDef('skeleton_champion');
        const note = await channelStart(a2, 0, 'maelstrom', aimCh, c2?.x ?? champ.x, c2?.y ?? champ.y);
        await a2.waitFor((m) => m.t === 'action' && m.state === 'stop', 'sea held', 4000, note.mark);
      } catch {
        // A refused or broken note is a lost beat, not a lost fight.
      }
      await sleep(1400); // the last fuse burns down; the blow lands chilled
      winterCeremony = winterSaid();
    }
  }
  receipt('winter takes what winter marked — the champion\'s page fills', winterCeremony !== null);

  // The taught winter, staked and held.
  await seat(a2, 'winters_fall', 2);
  await waitCd(a2, 2);
  aFx = a2.fxMark();
  const meWf = a2.own();
  const wf = await channelStart(a2, 2, 'winters_fall', 0, meWf.x + 5, meWf.y + 2);
  const wfStart = wf.start;
  mark = wf.mark;
  const wfStop = await a2.waitFor((m) => m.t === 'action' && m.state === 'stop', 'winter end', 6000, mark);
  const wfBeats = a2.fxSince(aFx, 'telegraph', 'winters_fall');
  receipt(
    'the winter pours from a staked sky, beat on beat',
    wfStart.ticks === 64 && wfStop.reason === 'done' && wfBeats.length >= 3,
    `${wfBeats.length} falls`,
  );

  // ================================================================
  // S6 — THE FIVE TAUGHT VOICES, each speaking over the real wire.
  // ================================================================
  // Back to the vetted-empty course center — the deed battlefield
  // behind us keeps its stray survivors.
  await tp(a2, CX, CY);
  await tp(b, CX + 2, CY + 1);
  await sleep(300);

  // --- Threshold teaches Kept Ground: a held nova ring, planted point.
  await give(a2, 'threshold');
  await equipFromPack(a2, 'threshold');
  await seat(a2, 'kept_ground', 0);
  await waitCd(a2, 0);
  aFx = a2.fxMark();
  bFx = b.fxMark();
  const kg = await channelStart(a2, 0, 'kept_ground');
  const kgStart = kg.start;
  mark = kg.mark;
  const kgStop = await a2.waitFor((m) => m.t === 'action' && m.state === 'stop', 'kept ground end', 5000, mark);
  await sleep(200);
  const kgBeats = a2.fxSince(aFx, 'nova', 'kept_ground');
  const kgHums = b.fxSince(bFx, 'note', 'kept_ground');
  receipt(
    'THE THRESHOLD: kept ground bites every held beat, humming',
    kgStart.ticks === 48 && kgStop.reason === 'done' && kgBeats.length >= 3 && kgHums.length >= 2,
    `${kgBeats.length} bites, ${kgHums.length} hums`,
  );

  // --- Kerbstone teaches The Standing Stone: a staked, casted summon.
  // A fresh maul — a death in the champion brawl can spill the pack,
  // and the proving never depends on battlefield archaeology.
  await give(a2, 'kerbstone');
  await equipFromPack(a2, 'kerbstone');
  await seat(a2, 'standing_stone', 0);
  await waitCd(a2, 0);
  bFx = b.fxMark();
  const meSs = a2.own();
  const ss = await castOnce(a2, 0, { tx: meSs.x + 3, ty: meSs.y });
  if (ss.fireAt === null) throw new Error('the stone never stood');
  await sleep(300);
  const ssMark = b.fxSince(bFx, 'telegraph', 'standing_stone');
  const ssStand = b.fxSince(bFx, 'summon', 'standing_stone');
  receipt(
    'THE KERBSTONE: the stone is promised on the planted clock, then stands',
    ss.startTicks === 24 && ssMark.length >= 1 && ssMark[0]!.ticks === 20 && ssStand.length === 1,
    `mark ${ssMark[0]?.ticks} ticks, ${ssStand.length} stone`,
  );

  // --- Oxbow teaches The Full Draw: the longest wind in the game.
  await give(a2, 'oxbow');
  await equipFromPack(a2, 'oxbow');
  await seat(a2, 'full_draw', 0);
  await waitCd(a2, 0);
  bFx = b.fxMark();
  const fd = await castOnce(a2, 0);
  if (fd.fireAt === null) throw new Error('the full draw never loosed');
  const fdDt = fd.fireAt - fd.startAt;
  const fdCharges = b.fxSince(bFx, 'charge', 'full_draw');
  receipt(
    'THE OXBOW: the full draw holds past the ear, then looses',
    fd.startTicks === FULL_DRAW_TICKS && fdDt >= plantedMs(FULL_DRAW_TICKS) - 160 && fdDt <= plantedMs(FULL_DRAW_TICKS) + 160 && fdCharges.length >= 2,
    `${fdDt} ms planted (law ${plantedMs(FULL_DRAW_TICKS)}), ${fdCharges.length} gathers`,
  );

  // --- Candlewake teaches Vigil: the first sustained heal.
  await equipFromPack(a2, 'candlewake');
  await seat(a2, 'vigil', 0);
  await waitCd(a2, 0);
  // The vigil needs a wound to close (hpPct rides 0..255). If the
  // champion left the body whole, a wolf lends an honest one.
  let hurtNow = a2.own().hpPct;
  if (hurtNow > 235) {
    await a2.say('/spawnmob wolf 1');
    const t0 = Date.now();
    while (Date.now() - t0 < 15_000 && a2.own().hpPct > 235) await sleep(300);
    const w = a2.own();
    await tp(a2, w.x + 30, w.y - 25); // leave the wolf to its field
    await sleep(600);
    hurtNow = a2.own().hpPct;
  }
  if (hurtNow >= 254) throw new Error('the vigil found no wound to close');
  aFx = a2.fxMark();
  const vi = await channelStart(a2, 0, 'vigil');
  const viStart = vi.start;
  mark = vi.mark;
  const viStop = await a2.waitFor((m) => m.t === 'action' && m.state === 'stop', 'vigil end', 6000, mark);
  await sleep(300);
  const healedTo = a2.own().hpPct;
  const viBeats = a2.fxSince(aFx, 'buff', 'vigil');
  receipt(
    'THE CANDLEWAKE: each held beat closes a wound on the watch',
    viStart.ticks === 64 && viStop.reason === 'done' && healedTo > hurtNow && viBeats.length >= 3,
    `hp ${hurtNow} -> ${healedTo}, ${viBeats.length} beats`,
  );

  // --- Heartspindle teaches Red Thread: the held blood beam, live aim.
  await give(a2, 'heartspindle');
  await equipFromPack(a2, 'heartspindle');
  await seat(a2, 'red_thread', 0);
  await waitCd(a2, 0);
  await a2.say('/spawnmob skeleton 1');
  await sleep(1100);
  const prey = a2.findByDef('skeleton');
  if (!prey) throw new Error('no skeleton answered the spindle');
  const meRt = a2.own();
  const aimRt = Math.atan2(prey.y - meRt.y, prey.x - meRt.x);
  const preyHp0 = prey.hpPct;
  aFx = a2.fxMark();
  const rt = await channelStart(a2, 0, 'red_thread', aimRt);
  const rtStart = rt.start;
  mark = rt.mark;
  // Keep the aim live on the moving prey — the beam steers, feet planted.
  const steer = setInterval(() => {
    const p = a2.findByDef('skeleton');
    const s = a2.own();
    if (p) a2.frame(0, 0, 0, Math.atan2(p.y - s.y, p.x - s.x));
  }, 150);
  const rtStop = await a2.waitFor((m) => m.t === 'action' && m.state === 'stop', 'thread end', 6000, mark);
  clearInterval(steer);
  await sleep(200);
  const threads = a2.fxSince(aFx, 'beam', 'red_thread');
  const preyNow = a2.findByDef('skeleton');
  const preyBled = preyNow === null || preyNow.hpPct < preyHp0;
  receipt(
    'THE HEARTSPINDLE: the thread winds only while you hold still, and drinks',
    rtStart.ticks === 48 && rtStop.reason === 'done' && threads.length >= 2 && preyBled,
    `${threads.length} windings, prey ${preyNow === null ? 'spent' : `${preyHp0} -> ${preyNow.hpPct}`}`,
  );

  console.log(`\nTHE DRAWN BREATH HOLDS — ${passed} receipts, all honest.`);
  a2.ws.close();
  b.ws.close();
  process.exit(0);
};

main().catch((err) => {
  console.error(`\nTHE PROVING BROKE after ${passed} receipts: ${err?.message ?? err}`);
  process.exit(1);
});
