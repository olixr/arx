/**
 * THE PROVING — live receipts for THE SECOND GRIP, driven over the
 * real wire against the running dev server. Registers a throwaway
 * account and walks the whole epic: stow a weapon at the ready,
 * refuse the un-stowable aloud, trade the sets atomically, measure
 * the honest beat against the first legal swing, watch the traded
 * string die and the drawn arrow stay in its quiver, pair blades in
 * the stowed row and hear the dual-wield ceremony speak at the
 * HANDS, shed the stowed shield under the two-hands law, refuse the
 * empty back quietly, swallow the in-beat re-press, keep the row
 * across a relog — and, from a SECOND client, see THE QUIET BACK:
 * the active set changes on the trade and the stowed slots never
 * ride the appearance wire at all.
 *
 * Usage (against a running dev server; FRESH WORLD LAW — use a fresh
 * DB for a proving server):
 *   npm run prove:weapon-sets -w @arx/tools
 *   ARX_PROVE_URL=ws://localhost:8800/ws npm run prove:weapon-sets -w @arx/tools
 */
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '@arx/shared';

const URL = process.env.ARX_PROVE_URL ?? 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));
const USER = `grip_${STAMP}`;
const CHAR = `Grip ${STAMP}`;

type Msg = Record<string, any>;
const ATTACK = 1 << 0;
const SWAP = 1 << 11;

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  stamps: number[] = [];
  seq = 1;
  /**
   * THE HEARTBEAT: a real client's fixed-step loop sends one frame per
   * 50ms tick whether or not anything changed, repeating the held
   * buttons — and the seq-domain beat locks (ONE LAW, TWO MIRRORS)
   * count in exactly those frames. A harness that only speaks when it
   * has something to say under-advances the seq clock and reads every
   * beat as still armed; this timer makes the fake client walk the
   * wire like the live one.
   */
  private lastButtons = 0;
  private lastAim = 0;
  private lastFrameAt = 0;
  private beat: ReturnType<typeof setInterval> | null = null;
  open(): Promise<void> {
    this.ws = new WebSocket(URL);
    this.ws.on('message', (d: Buffer, isBinary: boolean) => {
      if (isBinary) return;
      this.msgs.push(JSON.parse(d.toString()));
      this.stamps.push(Date.now());
    });
    this.ws.on('close', () => {
      if (this.beat) clearInterval(this.beat);
      this.beat = null;
    });
    return new Promise((res, rej) => {
      this.ws.on('open', () => res());
      this.ws.on('error', rej);
    });
  }
  send(m: Msg): void {
    this.ws.send(JSON.stringify(m));
  }
  frame(buttons: number, aim = 0): void {
    this.lastButtons = buttons;
    this.lastAim = aim;
    this.lastFrameAt = Date.now();
    // The heartbeat wakes on the first deliberate frame — after the
    // script has logged in and entered the world, never before — and
    // only FILLS GAPS: it never stacks on a script that is already
    // speaking at tick rate (the session's input budget is 25/s; a
    // real client sends exactly 20). The cadence must be TRUE 20/s:
    // the seq-domain beat locks translate frames to wall time, so an
    // under-rate heartbeat stretches every beat and reads locks as
    // still armed past their honest 600ms.
    this.beat ??= setInterval(() => {
      if (this.ws.readyState !== this.ws.OPEN) return;
      if (Date.now() - this.lastFrameAt < 45) return;
      this.lastFrameAt = Date.now();
      this.send({
        t: 'input',
        frame: { seq: this.seq++, mx: 0, my: 0, aim: this.lastAim, buttons: this.lastButtons },
      });
    }, 10);
    this.send({ t: 'input', frame: { seq: this.seq++, mx: 0, my: 0, aim, buttons } });
  }
  async press(buttons: number): Promise<void> {
    this.frame(buttons);
    await sleep(120);
    this.frame(0);
    await sleep(180);
  }
  async waitFor(pred: (m: Msg) => boolean, label: string, timeoutMs = 4000, from = 0): Promise<Msg> {
    const t0 = Date.now();
    let i = from;
    for (;;) {
      for (; i < this.msgs.length; i++) if (pred(this.msgs[i]!)) return this.msgs[i]!;
      if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${label}`);
      await sleep(60);
    }
  }
  /** Index of the first message from `from` matching pred, or -1. */
  indexOf(pred: (m: Msg) => boolean, from = 0): number {
    for (let i = from; i < this.msgs.length; i++) if (pred(this.msgs[i]!)) return i;
    return -1;
  }
  mark(): number {
    return this.msgs.length;
  }
  latest(t: string): Msg | undefined {
    for (let i = this.msgs.length - 1; i >= 0; i--) if (this.msgs[i]!.t === t) return this.msgs[i];
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
function receipt(name: string, ok: boolean, detail = ''): void {
  if (!ok) throw new Error(`RECEIPT FAILED: ${name} ${detail}`);
  passed++;
  console.log(`RECEIPT ${String(passed).padStart(2)}  ${name}${detail ? `  (${detail})` : ''}`);
}

function packIndex(c: Client, item: string): number {
  const inv = c.latest('inv');
  if (!inv) throw new Error('no inv yet');
  return inv.slots.findIndex((s: any) => s && s.item === item);
}

function packCount(c: Client, item: string): number {
  const inv = c.latest('inv');
  if (!inv) return 0;
  let n = 0;
  for (const s of inv.slots) if (s && s.item === item) n += s.qty;
  return n;
}

/**
 * Send a chat command and wait for its ack — riding out the chat
 * bucket ("You are talking too fast."): a throttled command backs off
 * for the refill and tries again. A proving lane that trips over its
 * own pace is a lane nobody trusts.
 */
async function command(
  c: Client,
  text: string,
  ack: (m: Msg) => boolean,
  label: string,
): Promise<Msg> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const mark = c.mark();
    c.send({ t: 'chat', text });
    const t0 = Date.now();
    let i = mark;
    let throttled = false;
    while (Date.now() - t0 < 2500 && !throttled) {
      for (; i < c.msgs.length; i++) {
        const m = c.msgs[i]!;
        if (ack(m)) return m;
        if (m.t === 'chat' && /talking too fast/.test(m.text ?? '')) {
          throttled = true;
          break;
        }
      }
      if (!throttled) await sleep(60);
    }
    await sleep(1000); // the bucket refills; try again
  }
  throw new Error(`command never acked: ${label}`);
}

async function give(c: Client, item: string): Promise<void> {
  await command(c, `/give ${item} 1`, (m) => m.t === 'inv', `/give ${item}`);
}

async function xp(c: Client, skill: string, amount: number): Promise<void> {
  await command(c, `/xp ${skill} ${amount}`, (m) => m.t === 'xp' && m.skill === skill, `${skill} xp`);
}

async function equipFromPack(c: Client, item: string): Promise<void> {
  const idx = packIndex(c, item);
  if (idx < 0) throw new Error(`${item} not in pack`);
  const mark = c.mark();
  c.send({ t: 'use', slot: idx });
  await c.waitFor((m) => m.t === 'equip', `equip ${item}`, 4000, mark);
  await sleep(120);
}

async function stowFromPack(c: Client, item: string): Promise<Msg> {
  const idx = packIndex(c, item);
  if (idx < 0) throw new Error(`${item} not in pack`);
  const mark = c.mark();
  c.send({ t: 'use', slot: idx, stow: true });
  // A gate refusal comes back as chat, never an equip — a lane that
  // times out silently on it is a lane that lies about WHERE it died.
  const got = await c.waitFor(
    (m) => m.t === 'equip' || (m.t === 'chat' && /You need \w+ level/.test(m.text ?? '')),
    `equip after stow ${item}`,
    4000,
    mark,
  );
  if (got.t === 'chat') throw new Error(`stow ${item} refused: ${got.text}`);
  await sleep(120);
  return got;
}

const main = async () => {
  const a = new Client();
  await a.open();
  a.send({ t: 'hello', v: PROTOCOL_VERSION });
  a.send({ t: 'register', user: USER, pass: 'proving123', name: CHAR });
  await a.waitFor((m) => m.t === 'welcome', 'welcome (register)');
  await a.waitFor((m) => m.t === 'inv', 'first inv push');
  await sleep(300);

  // The witness: a second pair of eyes at the same hearth, watching
  // A's appearance ride the update wire. Registered before any trade
  // so it sees every arrangement A ever broadcasts.
  const b = new Client();
  await b.open();
  b.send({ t: 'hello', v: PROTOCOL_VERSION });
  b.send({ t: 'register', user: `${USER}w`, pass: 'proving123', name: `${CHAR} W` });
  await b.waitFor((m) => m.t === 'welcome', 'welcome (witness)');
  await sleep(500);

  // --- R: the stow verb lands a weapon at the ready, hands untouched.
  await xp(a, 'archery', 500);
  await give(a, 'shortbow');
  await equipFromPack(a, 'bronze_sword');
  let eq = await stowFromPack(a, 'shortbow');
  receipt(
    'the stow verb lands the bow at the ready, hands untouched',
    eq.equipment?.stowWeapon?.id === 'shortbow' && eq.equipment?.weapon?.id === 'bronze_sword',
  );

  // --- R: the un-stowable refuses aloud and nothing moves.
  await give(a, 'iron_helm');
  let mark = a.mark();
  a.send({ t: 'use', slot: packIndex(a, 'iron_helm'), stow: true });
  await a.waitFor(
    (m) => m.t === 'chat' && /no place at the ready/.test(m.text ?? ''),
    'stow refusal line',
    4000,
    mark,
  );
  receipt(
    'the un-stowable refuses aloud, and stays in the pack',
    packIndex(a, 'iron_helm') >= 0 && a.latest('equip')?.equipment?.head === undefined,
  );

  // --- R: THE HONEST TRADE is atomic, and the witness sees only the
  // active set change (THE QUIET BACK's wire half is asserted at the
  // very end, over every update B ever received).
  mark = a.mark();
  const bMark = b.mark();
  a.frame(SWAP);
  await sleep(80);
  a.frame(0);
  eq = await a.waitFor((m) => m.t === 'equip', 'equip after trade', 4000, mark);
  receipt(
    'THE HONEST TRADE: one atomic exchange over the wire',
    eq.equipment?.weapon?.id === 'shortbow' && eq.equipment?.stowWeapon?.id === 'bronze_sword',
  );
  const seen = await b.waitFor(
    (m) =>
      m.t === 'update' &&
      (m.entities ?? []).some(
        (e: any) => e.name === CHAR && e.appearance?.equip?.weapon === 'shortbow',
      ),
    'witness sees the bow arrive in the hands',
    5000,
    bMark,
  );
  receipt('the witness sees the ACTIVE set change on the trade', !!seen);

  // --- R: the drawn arrow dies with the trade (the cast-family kill:
  // drawTicks zeroes exactly where casts cancel). Draw with the bow,
  // trade mid-draw, release — the quiver must not lighten. The R3
  // beat must drain FIRST: this receipt is about a LEGAL trade
  // killing a live draw — inside the beat the trade is refused, the
  // draw-lock keeps the string from ever drawing, and the receipt
  // passes vacuously (the old under-sending harness hid exactly that).
  await sleep(700);
  const arrowsBefore = packCount(a, 'arrow');
  for (let i = 0; i < 8; i++) {
    a.frame(ATTACK);
    await sleep(50);
  }
  a.frame(ATTACK | SWAP); // the trade lands mid-draw
  await sleep(60);
  a.frame(0); // release: a live draw at 8+ ticks would loose
  await sleep(700);
  receipt(
    'the traded draw never looses — the arrow stays home',
    packCount(a, 'arrow') === arrowsBefore,
    `${arrowsBefore} arrows before and after`,
  );

  // The mid-draw trade above left the SWORD in the hands. Return the
  // bow first, so the beat measure below trades the SWORD back in —
  // exactly as its receipt reads. (The heartbeat walks the wire at a
  // real client's tick rate now, so the mid-draw trade lands inside
  // its authored window instead of being quietly beaten — the old
  // under-sending harness never advanced the seq clock past the R3
  // beat, and this receipt passed on a draw that had never started.)
  await sleep(700); // the mid-draw trade's own beat drains
  await a.press(SWAP); // the bow returns to the hands
  await sleep(800);

  // --- R: the beat is honest — the sword trades in; attack held
  // through the beat lands its FIRST swing only after the lock lifts.
  await sleep(200); // the bow trade's beat drains fully below
  const eqIdx = a.mark();
  const tradeAt = a.indexOf((m) => m.t === 'equip', eqIdx - 30); // anchor below
  mark = a.mark();
  a.frame(SWAP); // trade back: sword returns to the hands
  const eqMsg = await a.waitFor((m) => m.t === 'equip', 'equip for the beat measure', 4000, mark);
  const tEquip = a.stamps[a.msgs.indexOf(eqMsg)]!;
  // Hold the attack from the moment the trade is sent.
  const holdUntil = Date.now() + 1600;
  const holder = (async () => {
    while (Date.now() < holdUntil) {
      a.frame(ATTACK);
      await sleep(50);
    }
    a.frame(0);
  })();
  const combo = await a.waitFor((m) => m.t === 'combo', 'first swing after the trade', 4000, mark);
  const tSwing = a.stamps[a.msgs.indexOf(combo)]!;
  await holder;
  const waited = tSwing - tEquip;
  receipt(
    'THE HONEST BEAT: the first legal swing waits out the lock',
    waited >= 450 && waited <= 1500,
    `${waited}ms from trade echo to first swing (beat 600)`,
  );
  receipt('the sword returned in that trade', eqMsg.equipment?.weapon?.id === 'bronze_sword');
  void tradeAt;

  // --- R: the traded string is a dropped string. Swing to stage 2,
  // trade out and back, swing — the string must start fresh.
  await sleep(1200);
  mark = a.mark();
  for (let i = 0; i < 24 && a.indexOf((m) => m.t === 'combo' && m.stage >= 1, mark) < 0; i++) {
    a.frame(ATTACK);
    await sleep(60);
  }
  a.frame(0);
  const midString = await a.waitFor((m) => m.t === 'combo' && m.stage >= 1, 'a string past stage 0', 4000, mark);
  await a.press(SWAP); // bow out — the string's weapon leaves
  await sleep(700);
  await a.press(SWAP); // sword back
  await sleep(700);
  mark = a.mark();
  for (let i = 0; i < 10 && a.indexOf((m) => m.t === 'combo', mark) < 0; i++) {
    a.frame(ATTACK);
    await sleep(60);
  }
  a.frame(0);
  const fresh = await a.waitFor((m) => m.t === 'combo', 'first swing of the fresh string', 4000, mark);
  receipt(
    'the traded string is a dropped string',
    fresh.stage === 0 && fresh.run === 1,
    `was stage ${midString.stage} run ${midString.run}; fresh stage ${fresh.stage} run ${fresh.run}`,
  );

  // --- R: the beat swallows the re-press — two presses inside one
  // beat trade exactly once.
  await sleep(1200);
  mark = a.mark();
  a.frame(SWAP);
  await sleep(80);
  a.frame(0);
  await sleep(100);
  a.frame(SWAP); // inside the beat — must be swallowed
  await sleep(80);
  a.frame(0);
  await sleep(900);
  const trades = a.msgs.slice(mark).filter((m) => m.t === 'equip').length;
  receipt('the beat swallows the in-beat re-press: one trade, not two', trades === 1, `${trades} equip echo`);

  // --- R: THE TWO-HANDS LAW holds in the stowed row (the shield
  // sheds to the pack when a stowed two-hander needs both fists).
  await xp(a, 'defence', 800);
  await xp(a, 'twohand', 20000);
  await give(a, 'oak_kiteshield');
  eq = await stowFromPack(a, 'oak_kiteshield');
  receipt('a shield stows to the ready off hand', eq.equipment?.stowOffhand?.id === 'oak_kiteshield');
  await give(a, 'iron_greatblade');
  mark = a.mark();
  eq = await stowFromPack(a, 'iron_greatblade');
  await a.waitFor((m) => m.t === 'chat' && /both hands/.test(m.text ?? ''), 'the shed is spoken', 4000, mark);
  receipt(
    'THE TWO-HANDS LAW sheds the stowed shield, aloud, into the pack',
    eq.equipment?.stowWeapon?.id === 'iron_greatblade' &&
      eq.equipment?.stowOffhand === undefined &&
      packIndex(a, 'oak_kiteshield') >= 0,
  );

  // --- R: pairing blades in the stowed row is silent planning; the
  // trade that brings them to the HANDS speaks the dual-wield
  // ceremony (ONE DOOR, either road in).
  await xp(a, 'onehand', 60000); // past the dual-wield unlock with room to spare
  await xp(a, 'sneak', 60000); // daggers gate on SNEAK — the lane's own receipt taught us
  await give(a, 'bronze_dagger');
  eq = await stowFromPack(a, 'bronze_dagger'); // replaces the greatblade
  await give(a, 'iron_dagger');
  mark = a.mark();
  eq = await stowFromPack(a, 'iron_dagger'); // pairs into the ready off hand
  receipt(
    'the stowed row pairs blades in silence',
    eq.equipment?.stowWeapon?.id === 'bronze_dagger' &&
      eq.equipment?.stowOffhand?.id === 'iron_dagger' &&
      a.indexOf((m) => m.t === 'xp' && m.skill === 'dualwield', mark) < 0,
  );
  mark = a.mark();
  await a.press(SWAP);
  await a.waitFor((m) => m.t === 'xp' && m.skill === 'dualwield', 'the ceremony xp', 4000, mark);
  receipt('the trade that hands over two blades wakes the hidden school', true);
  await sleep(800);

  // --- R: EMPTY HANDS REFUSE QUIETLY — clear the ready row, press.
  a.send({ t: 'unequip', slot: 'stowWeapon' });
  await sleep(300);
  mark = a.mark();
  a.frame(SWAP);
  await sleep(80);
  a.frame(0);
  await a.waitFor(
    (m) => m.t === 'chat' && /Nothing waits at your back/.test(m.text ?? ''),
    'the empty refusal line',
    4000,
    mark,
  );
  receipt(
    'EMPTY HANDS REFUSE QUIETLY, in the quartermaster voice',
    a.msgs.slice(mark).filter((m) => m.t === 'equip').length === 0,
  );

  // --- R: the ready row survives the relog whole.
  await give(a, 'shortbow');
  await stowFromPack(a, 'shortbow');
  a.ws.close();
  await sleep(1200);
  const a2 = new Client();
  await a2.open();
  a2.send({ t: 'hello', v: PROTOCOL_VERSION });
  a2.send({ t: 'login', user: USER, pass: 'proving123' });
  await a2.waitFor((m) => m.t === 'welcome', 'welcome (relog)');
  const eq2 = await a2.waitFor((m) => m.t === 'equip', 'equip on relog');
  receipt(
    'the ready row survives the relog whole',
    eq2.equipment?.stowWeapon?.id === 'shortbow',
    `stowWeapon ${eq2.equipment?.stowWeapon?.id}`,
  );
  a2.ws.close();

  // --- R: THE QUIET BACK's wire half — across EVERYTHING the witness
  // ever received, A's appearance never once carried a stowed slot.
  const leaks = b.msgs.filter(
    (m) =>
      m.t === 'update' &&
      (m.entities ?? []).some(
        (e: any) =>
          e.name === CHAR &&
          (e.appearance?.equip?.stowWeapon !== undefined ||
            e.appearance?.equip?.stowOffhand !== undefined),
      ),
  );
  receipt(
    'THE QUIET BACK: the stowed slots never ride the appearance wire',
    leaks.length === 0,
    `${b.msgs.filter((m) => m.t === 'update').length} updates witnessed, 0 leaks`,
  );
  b.ws.close();

  console.log(`\nTHE PROVING: ${passed} receipts, all honest.`);
  process.exit(0);
};

main().catch((err) => {
  console.error('\nPROVING FAILED:', err.message);
  process.exit(1);
});
