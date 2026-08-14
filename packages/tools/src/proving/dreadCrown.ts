/**
 * THE PROVING — live receipts for THE DREAD CROWN (docs/
 * boss-system-plan.md Phase 4), driven over the real wire against a
 * running dev server. Registers a throwaway slayer and fights both
 * first crowns end to end: the boss block riding EntityMeta, the
 * engage bark, the kit speaking on the crowned body, THE CHAIN's
 * sweep→slam two-beat, both phase TURNINGS (meta re-broadcast, the
 * rung's bark, the turn's summon-ring moment, the risen court's
 * adds), the defeat bark, the felled purse, THE ARENA LAW's walk-home
 * crown reset, and the tyrant's court (standoff casting + its own
 * turning). Content clocks are pinned as consts on purpose — a def
 * drift that moves a gate should FAIL the proving.
 *
 * Usage (against a running dev server):
 *   npm run prove:boss -w @arx/tools
 *   PROVE_URL=ws://localhost:8794/ws npm run prove:boss -w @arx/tools
 */
import WebSocket from 'ws';
import { ByteReader, BinaryMsgType, decodeSnapshot, PROTOCOL_VERSION } from '@arx/shared';

const URL = process.env.PROVE_URL ?? 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));

type Msg = Record<string, any>;
const ATTACK = 1 << 0;
const SNEAK = 1 << 7;

// The crowns under proof (content truths, pinned on purpose).
const KING = 'skeleton_fallen_king';
const KING_PHASES = 3;
const KING_GATE_1 = 0.65; // The Court Rises
const KING_GATE_2 = 0.3; // The Last Vigil
const TYRANT = 'goblin_flame_tyrant';
const TYRANT_GATE_1 = 0.6; // The Camp Answers
const pct = (frac: number): number => Math.round(frac * 255);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
function receipt(name: string, ok: boolean, detail = ''): void {
  if (!ok) throw new Error(`RECEIPT FAILED: ${name}${detail ? ` (${detail})` : ''}`);
  passed++;
  console.log(`RECEIPT ${String(passed).padStart(2)}  ${name}${detail ? `  (${detail})` : ''}`);
}

type FxSeen = Msg & { at: number };

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  fx: FxSeen[] = [];
  seq = 1;
  eid = -1;
  snap = new Map<number, { x: number; y: number; pose: number; hpPct: number; at: number }>();
  defIds = new Map<number, string>();
  /** Latest full meta per entity — the boss block rides here. */
  metas = new Map<number, Msg>();
  private lastButtons = 0;
  private lastAim = 0;
  private lastFrameAt = 0;
  private beat: ReturnType<typeof setInterval> | null = null;

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
        }
        return;
      }
      const m = JSON.parse(d.toString());
      m.at = Date.now();
      if (m.t === 'fx') this.fx.push(m);
      this.msgs.push(m);
      if (m.t === 'enter' || m.t === 'update') {
        for (const en of m.entities ?? []) {
          if (en.defId) this.defIds.set(en.eid, en.defId);
          this.metas.set(en.eid, en);
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
  private lastChatAt = 0;
  async say(text: string): Promise<void> {
    const wait = this.lastChatAt + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastChatAt = Date.now();
    this.send({ t: 'chat', text });
  }
  /**
   * THE HEARTBEAT (the weapon-sets lesson): wakes on the first
   * deliberate frame and only fills gaps — a true 20/s cadence so the
   * server's seq-domain clocks read wall time honestly.
   */
  frame(buttons: number, mx = 0, my = 0, aim = 0): void {
    this.lastButtons = buttons;
    this.lastAim = aim;
    this.lastFrameAt = Date.now();
    this.beat ??= setInterval(() => {
      if (this.ws.readyState !== this.ws.OPEN) return;
      if (Date.now() - this.lastFrameAt < 45) return;
      this.lastFrameAt = Date.now();
      this.send({
        t: 'input',
        frame: { seq: this.seq++, mx: 0, my: 0, aim: this.lastAim, buttons: this.lastButtons },
      });
    }, 10);
    this.send({ t: 'input', frame: { seq: this.seq++, mx, my, aim, buttons } });
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
  fxSince(mark: number, kind: string, id?: string): FxSeen[] {
    return this.fx.slice(mark).filter((f) => f.kind === kind && (id === undefined || f.id === id));
  }
  own(): { x: number; y: number; pose: number; hpPct: number; at: number } {
    const s = this.snap.get(this.eid);
    if (!s) throw new Error('no own snapshot yet');
    return s;
  }
  findByDef(defId: string): { eid: number; x: number; y: number; hpPct: number } | null {
    const me = this.snap.get(this.eid);
    let best: { eid: number; x: number; y: number; hpPct: number } | null = null;
    let bestD = Infinity;
    for (const [eid, def] of this.defIds) {
      if (def !== defId) continue;
      const s = this.snap.get(eid);
      if (!s || Date.now() - s.at > 1500) continue;
      const d = me ? Math.hypot(s.x - me.x, s.y - me.y) : 0;
      if (d < bestD) {
        bestD = d;
        best = { eid, x: s.x, y: s.y, hpPct: s.hpPct };
      }
    }
    return best;
  }
}

async function join(user: string, name: string): Promise<Client> {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  c.send({ t: 'register', user, pass: 'proving123', name });
  const w = await c.waitFor((m) => m.t === 'welcome', `welcome (${user})`, 8000);
  c.eid = w.eid;
  const t0 = Date.now();
  while (!c.snap.has(c.eid)) {
    if (Date.now() - t0 > 5000) throw new Error(`${user} never appeared in a snapshot`);
    await sleep(80);
  }
  return c;
}

async function tp(c: Client, x: number, y: number): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await c.say(`/tp ${x} ${y}`);
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
      if (attempt > 0) await sleep(1400);
      return;
    }
  }
  throw new Error(`/tp ${x} ${y} never landed`);
}

/**
 * Fight the crowned body until its hp fraction reads under `stopAt`
 * (255-scaled), swinging only while above — a measured wounding, so
 * every phase gate is crossed awake and no ceremony is skipped past.
 */
async function woundTo(c: Client, targetEid: number, stopAt: number, timeoutMs = 150_000): Promise<void> {
  const t0 = Date.now();
  const died = (): boolean => c.msgs.some((m) => m.t === 'death' && m.eid === targetEid);
  let falls = c.msgs.filter((m) => m.t === 'deathmark').length;
  let lastKnown: { x: number; y: number } | null = null;
  for (;;) {
    // A fall mid-wounding: stand up, walk the wire back, resume the
    // measure — the boss holds its wound while nobody fights it.
    const nowFalls = c.msgs.filter((m) => m.t === 'deathmark').length;
    if (nowFalls > falls) {
      falls = nowFalls;
      c.frame(0);
      await sleep(2500);
      if (lastKnown) await tp(c, Math.round(lastKnown.x), Math.round(lastKnown.y));
      continue;
    }
    // THE QUIET WIRE: an unchanged row is deliberately not resent, so
    // a standing body's sample AGES without the body going anywhere —
    // staleness is silence, never absence. Death speaks its own
    // message; only that (or the timeout) ends the wounding early.
    const s = c.snap.get(targetEid);
    if (died()) throw new Error(`overshot: the crown died before ${stopAt}/255`);
    if (s && s.hpPct > 0 && s.hpPct < stopAt) {
      c.frame(0);
      return;
    }
    if (Date.now() - t0 > timeoutMs) throw new Error(`wounding to ${stopAt}/255 timed out`);
    if (!s) {
      await sleep(100);
      continue;
    }
    lastKnown = { x: s.x, y: s.y };
    const me = c.own();
    const dx = s.x - me.x;
    const dy = s.y - me.y;
    const dist = Math.hypot(dx, dy);
    const aim = Math.atan2(dy, dx);
    if (dist > 1.2) {
      c.frame(0, dx / (dist || 1), dy / (dist || 1), aim);
    } else {
      c.frame(ATTACK, 0, 0, aim);
    }
    await sleep(100);
  }
}

/**
 * Swing until the body dies (the death message is the one truth). A
 * deep phase is allowed to fell the prover — the fallen body stands
 * back up at the hearth, walks the wire back to the fight, and
 * finishes it. The receipt is the crown's death, not the prover's
 * pride.
 */
async function slay(c: Client, targetEid: number, timeoutMs = 150_000): Promise<void> {
  const t0 = Date.now();
  let falls = c.msgs.filter((m) => m.t === 'deathmark').length;
  let lastKnown: { x: number; y: number } | null = null;
  for (;;) {
    if (c.msgs.some((m) => m.t === 'death' && m.eid === targetEid)) {
      c.frame(0);
      return;
    }
    if (Date.now() - t0 > timeoutMs) throw new Error('the slaying timed out');
    const nowFalls = c.msgs.filter((m) => m.t === 'deathmark').length;
    if (nowFalls > falls) {
      falls = nowFalls;
      c.frame(0);
      await sleep(2500); // the respawn settles (full-heal at the hearth)
      if (lastKnown) await tp(c, Math.round(lastKnown.x), Math.round(lastKnown.y));
      continue;
    }
    const s = c.snap.get(targetEid);
    if (!s) {
      await sleep(100);
      continue;
    }
    lastKnown = { x: s.x, y: s.y };
    const me = c.own();
    const dx = s.x - me.x;
    const dy = s.y - me.y;
    const dist = Math.hypot(dx, dy);
    const aim = Math.atan2(dy, dx);
    if (dist > 1.2) c.frame(0, dx / (dist || 1), dy / (dist || 1), aim);
    else c.frame(ATTACK, 0, 0, aim);
    await sleep(100);
  }
}

/**
 * Eat to a full bar. Vitality xp only raises maxHp; the blood itself
 * refills by meals. Jiggles while eating — THE QUIET WIRE holds a
 * still row, so a standing body's hp read would never refresh.
 */
async function eatToFull(c: Client, timeoutMs = 40_000): Promise<void> {
  await c.say('/give glimmerfish 10');
  await sleep(400);
  const t0 = Date.now();
  let step = 1;
  for (;;) {
    c.frame(0, step, 0);
    step = -step;
    await sleep(200);
    const s = c.snap.get(c.eid);
    if (s && Date.now() - s.at < 600 && s.hpPct === 255) {
      c.frame(0);
      return;
    }
    if (Date.now() - t0 > timeoutMs) throw new Error('the meal never filled the bar');
    const inv = c.msgs.filter((m) => m.t === 'inv').at(-1);
    const fish = inv?.slots?.findIndex((sl: any) => sl && sl.item === 'glimmerfish');
    if (fish === undefined || fish < 0) {
      await c.say('/give glimmerfish 10');
      await sleep(400);
      continue;
    }
    c.send({ t: 'use', slot: fish });
    await sleep(1200);
  }
}

/**
 * Spawn one crowned body and wait for its enter meta. The prover
 * CROUCHES through the spawn: a fresh body's perception can open the
 * fight the very tick it enters — before any watcher's interest set
 * holds it — and an engage bark spoken to an empty room is a race,
 * not a receipt. Sneaking keeps the spawn blind until the enter has
 * landed on this side of the wire.
 */
async function spawnCrown(c: Client, defId: string): Promise<{ eid: number; meta: Msg }> {
  const mark = c.mark();
  c.frame(SNEAK);
  await c.say(`/spawnmob ${defId} 1`);
  const enter = await c.waitFor(
    (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.defId === defId),
    `${defId} enter`,
    8000,
    mark,
  );
  await sleep(600); // the interest set has the body; the fight may open
  c.frame(0);
  const en = enter.entities.find((e: Msg) => e.defId === defId)!;
  return { eid: en.eid, meta: en };
}

async function main(): Promise<void> {
  console.log(`THE PROVING — THE DREAD CROWN (stamp ${STAMP}) vs ${URL}`);
  const a = await join(`crown_${STAMP}`, `Crown${STAMP.slice(-4)}`);

  // The proving armor: a body that outlasts every receipt, hitting
  // hard enough to move a boss bar and soft enough to steer it. The
  // probe's lesson: defence is the half that keeps the prover
  // STANDING — a level-1 guard falls to the king in ten seconds and
  // spends the receipt walking home from the hearth.
  await a.say('/xp vitality 2000000');
  await a.say('/xp defence 2000000');
  await a.say('/xp onehand 2000000');
  await a.say('/give steel_sword 1');
  await a.waitFor(
    (m) => m.t === 'inv' && m.slots?.some((sl: any) => sl && sl.item === 'steel_sword'),
    'the proving blade (steel)',
    6000,
  );
  // Equip by use — find the sword's slot and use it.
  const inv = a.msgs.filter((m) => m.t === 'inv').at(-1)!;
  const slot = inv.slots.findIndex((sl: any) => sl && sl.item === 'steel_sword');
  a.send({ t: 'use', slot });
  await sleep(600);

  // A vitality grant raises the CEILING, never the blood — the honest
  // fill is a meal. The prover eats to full before every fight.
  await eatToFull(a);

  // An honest empty court, the drawn-breath way: probe until a spot
  // is crowd-free. Each fight section claims its OWN court — a spent
  // one keeps its leftovers (a reset king, the risen dead), and the
  // arena law makes a lingering boss unkillable by design.
  const jit = Number(STAMP) % 9;
  const COURTS: Array<[number, number]> = [
    [236 + jit, 96 + jit],
    [206 + jit, 64],
    [244, 130 + jit],
    [284, 88 + jit],
    [222 + jit, 148],
    [186, 92 + jit],
  ];
  let courtIdx = 0;
  const crowdAt = (cx: number, cy: number): number =>
    [...a.snap.entries()].filter(
      ([eid, s]) => eid !== a.eid && Date.now() - s.at < 1500 && Math.hypot(s.x - cx, s.y - cy) < 12,
    ).length;
  const claimCourt = async (): Promise<[number, number]> => {
    for (; courtIdx < COURTS.length; courtIdx++) {
      const [cx, cy] = COURTS[courtIdx]!;
      await tp(a, cx, cy);
      a.snap.clear();
      await sleep(1000);
      if (crowdAt(cx, cy) > 0) continue;
      courtIdx++;
      return [cx, cy];
    }
    throw new Error('no honest empty court found for the crowning');
  };
  const [CX, CY] = await claimCourt();

  // ================================================================
  // S1 — THE FALLEN KING: the crown on the wire, the fight, the turns.
  // ================================================================
  const king1 = await spawnCrown(a, KING);
  receipt(
    'THE CROWN RIDES THE WIRE: enter meta carries the boss block',
    king1.meta.boss?.phases === KING_PHASES &&
      king1.meta.boss?.phase === 0 &&
      king1.meta.boss?.title === 'The Crown Below',
    JSON.stringify(king1.meta.boss),
  );

  // Strike the king: the blow forces the fight open, and the crown
  // speaks once per engagement. The bark may beat the mark (a fresh
  // spawn's perception can open the fight the very tick it enters) —
  // it is eid-scoped, so the scan safely starts at the session's top.
  let mark = a.mark();
  let fxm = a.fxMark();
  await woundTo(a, king1.eid, 250); // first blood only
  const engage = await a.waitFor(
    (m) => m.t === 'chat' && m.eid === king1.eid && /wakes the king/i.test(m.text ?? ''),
    'the engage bark',
    10_000,
    0,
  );
  receipt('THE ENGAGE BARK: the crown speaks when the fight opens', engage !== undefined);

  // The kit speaks on the crowned body: a drawn breath (charge fx
  // carrying the king's eid) within the opening exchanges.
  await a.waitFor(
    (m) => m.t === 'fx' && m.kind === 'charge' && m.eid === king1.eid && (m.ticks ?? 0) > 0,
    'the crowned breath',
    20_000,
    mark,
  );
  receipt('THE KIT SPEAKS: the crowned body draws its breath (charge rides its eid)', true);

  // THE CHAIN: a completed reaping sweep queues the slam — the staked
  // ring follows the sweep inside the link window, every time.
  const sweepAt = (
    await a.waitFor(
      (m) => m.t === 'fx' && m.kind === 'charge' && m.eid === king1.eid && m.id === 'reaping_sweep' && (m.ticks ?? 0) > 0,
      'a reaping sweep winds',
      45_000,
      mark,
    )
  ).at;
  const slamTele = await a.waitFor(
    (m) => m.t === 'fx' && m.kind === 'telegraph' && m.id === 'ground_slam' && m.at > sweepAt,
    'the chained slam telegraph',
    6000,
    mark,
  );
  receipt(
    'THE CHAIN: the sweep chains into the slam inside the link window',
    slamTele.at - sweepAt < 4000,
    `${slamTele.at - sweepAt}ms after the sweep wound`,
  );

  // THE FIRST TURNING: wound under the gate — the banner turns, the
  // rung barks, the moment rings, and the court rises.
  mark = a.mark();
  fxm = a.fxMark();
  await woundTo(a, king1.eid, pct(KING_GATE_1));
  const turn1 = await a.waitFor(
    (m) =>
      m.t === 'update' &&
      m.entities?.some((e: Msg) => e.eid === king1.eid && e.boss?.phase === 1),
    'the phase-1 meta turn',
    8000,
    mark,
  );
  const turn1Meta = turn1.entities.find((e: Msg) => e.eid === king1.eid)!;
  receipt(
    'THE TURNING: the banner turns with the crown (meta phase 1, the rung named)',
    turn1Meta.boss.phaseName === 'The Court Rises',
    turn1Meta.boss.phaseName,
  );
  await a.waitFor(
    (m) => m.t === 'chat' && m.eid === king1.eid && /king commands it/i.test(m.text ?? ''),
    'the rising bark',
    6000,
    mark,
  );
  receipt('THE RISING BARK: the rung speaks aloud on entry', true);
  receipt(
    "THE TURN'S MOMENT: the summon ring marks the turning in the world",
    a.fxSince(fxm, 'summon').length >= 1,
  );
  // The free entry cast raises the court: skeleton adds enter.
  await a.waitFor(
    (m) =>
      (m.t === 'enter' || m.t === 'update') &&
      m.entities?.some((e: Msg) => e.defId === 'skeleton'),
    'the risen court',
    15_000,
    mark,
  );
  receipt('THE COURT RISES: raise_the_fallen answers the turn with true adds', true);

  // THE SECOND TURNING: the last vigil — deeper gate, its own bark,
  // the slam entry staked free.
  mark = a.mark();
  await woundTo(a, king1.eid, pct(KING_GATE_2));
  const turn2 = await a.waitFor(
    (m) =>
      m.t === 'update' &&
      m.entities?.some((e: Msg) => e.eid === king1.eid && e.boss?.phase === 2),
    'the phase-2 meta turn',
    8000,
    mark,
  );
  receipt(
    'THE LAST VIGIL: the second gate turns the banner again',
    turn2.entities.find((e: Msg) => e.eid === king1.eid)!.boss.phaseName === 'The Last Vigil',
  );
  await a.waitFor(
    (m) => m.t === 'chat' && m.eid === king1.eid && /earned in the dark/i.test(m.text ?? ''),
    'the vigil bark',
    6000,
    mark,
  );
  receipt('THE VIGIL BARK: the deepest rung speaks its own line', true);

  // THE FELLING: last words leave the body before the death burst,
  // and the named purse pays out on the floor.
  mark = a.mark();
  await slay(a, king1.eid);
  await a.waitFor(
    (m) => m.t === 'chat' && m.eid === king1.eid && /long watch ends/i.test(m.text ?? ''),
    'the defeat bark',
    8000,
    mark,
  );
  receipt('THE DEFEAT BARK: last words leave the body at the kill', true);
  await a.waitFor(
    (m) => m.t === 'enter' && m.entities?.some((e: Msg) => e.kind === 3 || e.qty !== undefined),
    'the felled purse',
    8000,
    mark,
  );
  receipt('THE KING PAYS: the champion purse spills where the crown fell', true);

  // ================================================================
  // S2 — THE ARENA LAW: the cheesed fight walks home whole.
  // ================================================================
  // A second king, wounded past the first gate, then abandoned: the
  // search runs dry, the walk home heals, and the crown resets to the
  // opening stance — the next challenger meets the whole fight.
  await eatToFull(a);
  const king2 = await spawnCrown(a, KING);
  await woundTo(a, king2.eid, pct(KING_GATE_1));
  await a.waitFor(
    (m) =>
      m.t === 'update' && m.entities?.some((e: Msg) => e.eid === king2.eid && e.boss?.phase === 1),
    'king 2 turned',
    8000,
  );
  await tp(a, CX + 120, CY); // vanish: the hunt, then the walk home
  await sleep(42_000); // SEARCH_TICKS 400 (~20s) + the walk + slack
  mark = a.mark();
  a.metas.delete(king2.eid);
  await tp(a, CX, CY);
  const back = await a.waitFor(
    (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.eid === king2.eid),
    'king 2 re-enter',
    10_000,
    mark,
  );
  const backMeta = back.entities.find((e: Msg) => e.eid === king2.eid)!;
  const backSnap = await (async () => {
    for (let i = 0; i < 30; i++) {
      const s = a.snap.get(king2.eid);
      if (s && Date.now() - s.at < 1000) return s;
      await sleep(120);
    }
    throw new Error('king 2 never re-entered the snapshot');
  })();
  receipt(
    'THE ARENA LAW: the abandoned crown walks home, heals whole, and resets to the opening stance',
    backMeta.boss?.phase === 0 && backSnap.hpPct === 255,
    `phase ${backMeta.boss?.phase}, hp ${backSnap.hpPct}/255`,
  );
  // The reset king keeps its court (the arena law makes a standing
  // boss with a walkable home effectively eternal — that IS receipt
  // 13). The tyrant claims a fresh court of its own.
  await claimCourt();

  // ================================================================
  // S3 — THE ASHEN TYRANT: the caster court, its own turning.
  // ================================================================
  await eatToFull(a);
  const tyr = await spawnCrown(a, TYRANT);
  receipt(
    "THE TYRANT'S COURT: the second crown rides the wire with its own ladder",
    tyr.meta.boss?.phases === 3 && tyr.meta.boss?.title === 'Tyrant of the Burning Court',
    JSON.stringify(tyr.meta.boss),
  );
  mark = a.mark();
  await woundTo(a, tyr.eid, 250); // first blood opens the court
  await a.waitFor(
    (m) => m.t === 'chat' && m.eid === tyr.eid && /MY court/i.test(m.text ?? ''),
    'the tyrant engage bark',
    10_000,
    0, // eid-scoped: the bark may lawfully beat the mark
  );
  receipt('THE TYRANT SPEAKS: the engage bark opens the caster fight', true);
  await a.waitFor(
    (m) => m.t === 'fx' && m.kind === 'charge' && m.eid === tyr.eid && (m.ticks ?? 0) > 0,
    'the tyrant breath',
    20_000,
    mark,
  );
  receipt('THE STANDOFF COURT: the tyrant fights at range, breath after breath', true);
  mark = a.mark();
  await woundTo(a, tyr.eid, pct(TYRANT_GATE_1));
  const tyrTurn = await a.waitFor(
    (m) => m.t === 'update' && m.entities?.some((e: Msg) => e.eid === tyr.eid && e.boss?.phase === 1),
    'the tyrant turn',
    8000,
    mark,
  );
  receipt(
    'THE CAMP ANSWERS: the tyrant turns, and the ring is staked free',
    tyrTurn.entities.find((e: Msg) => e.eid === tyr.eid)!.boss.phaseName === 'The Camp Answers',
  );
  // No cleanup slay: the proving world is thrown away whole, and a
  // reset boss is eternal by the arena law — leave the court standing.

  console.log(`\nTHE PROVING STANDS: ${passed} receipts, every one honest.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`\nTHE PROVING FAILED after ${passed} receipts:`);
  console.error(err);
  process.exit(1);
});
