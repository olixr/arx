/**
 * THE PROVING — live receipts for THE LIVING SOIL (farming v2 Phase
 * 1), driven over the real wire. Registers a throwaway farmer and
 * walks the whole law: the care mirror, the spoken fertilize refusal,
 * compost into soil, the mulch blanket, the watering with its wet
 * mirror, THE CARE FOLD paying a graded harvest, the compost bin's
 * batch (fed slot by slot, hurried by the dev lever, turned out), and
 * the well's 3x3 sweep.
 *
 * Usage (against an isolated rig):
 *   PORT=8791 DB_DATABASE=arx_prove HOST=127.0.0.1 npm run start -w @arx/server
 *   ARX_PROVE_URL=ws://127.0.0.1:8791/ws npm run prove:farm -w @arx/tools
 */
import WebSocket from 'ws';
import { ByteReader, BinaryMsgType, decodeSnapshot, PROTOCOL_VERSION } from '@arx/shared';

const URL = process.env.ARX_PROVE_URL ?? 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));
const USER = `farmer_${STAMP}`;
const CHAR = `Farmer ${STAMP}`;

type Msg = Record<string, any>;
type Sample = { x: number; y: number; at: number };

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  seq = 1;
  eid = -1;
  pos: Sample | null = null;
  open(): Promise<void> {
    this.ws = new WebSocket(URL);
    this.ws.on('message', (d: Buffer, isBinary: boolean) => {
      if (isBinary) {
        const buf = new Uint8Array(d).buffer;
        const r = new ByteReader(buf);
        if (r.u8() !== BinaryMsgType.Snapshot) return;
        const snap = decodeSnapshot(r);
        for (const e of snap.entities) {
          if (e.eid === this.eid) this.pos = { x: e.x, y: e.y, at: Date.now() };
        }
        return;
      }
      this.msgs.push(JSON.parse(d.toString()));
    });
    return new Promise((res, rej) => {
      this.ws.on('open', () => res());
      this.ws.on('error', rej);
    });
  }
  send(m: Msg): void {
    this.ws.send(JSON.stringify(m));
  }
  async waitFor(pred: (m: Msg) => boolean, label: string, timeoutMs = 6000, from = 0): Promise<Msg> {
    const t0 = Date.now();
    let i = from;
    for (;;) {
      for (; i < this.msgs.length; i++) if (pred(this.msgs[i]!)) return this.msgs[i]!;
      if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${label}`);
      await sleep(60);
    }
  }
  mark(): number {
    return this.msgs.length;
  }
  /** Latest inventory message's slots. */
  inv(): Array<{ item: string; qty: number } | null> {
    for (let i = this.msgs.length - 1; i >= 0; i--) {
      if (this.msgs[i]!.t === 'inv') return this.msgs[i]!.slots;
    }
    return [];
  }
  count(item: string): number {
    let n = 0;
    for (const s of this.inv()) if (s && s.item === item) n += s.qty;
    return n;
  }
  /** The freshest farm-mirror fact for a plot, walking every delta. */
  plotCare(tx: number, ty: number): { w: number; soil: number; m: number } | null {
    let out: { w: number; soil: number; m: number } | null = null;
    for (const m of this.msgs) {
      if (m.t !== 'farm') continue;
      for (const p of m.plots ?? []) if (p.tx === tx && p.ty === ty) out = p;
      for (const r of m.remove ?? []) if (r.tx === tx && r.ty === ty) out = null;
    }
    return out;
  }
  binState(tx: number, ty: number): { fill: number; graded: number; readyAt: number } | null {
    let out: { fill: number; graded: number; readyAt: number } | null = null;
    for (const m of this.msgs) {
      if (m.t !== 'farm') continue;
      for (const b of m.bins ?? []) if (b.tx === tx && b.ty === ty) out = b;
    }
    return out;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
function receipt(name: string, ok: boolean, detail = ''): void {
  if (!ok) throw new Error(`RECEIPT FAILED: ${name} ${detail}`);
  passed++;
  console.log(`RECEIPT ${String(passed).padStart(2)}  ${name}${detail ? `  (${detail})` : ''}`);
}

/** Dev commands ride the chat lane — spaced for its rate bucket. */
async function say(c: Client, text: string): Promise<void> {
  c.send({ t: 'chat', text });
  await sleep(1100);
}

async function tp(c: Client, x: number, y: number): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await say(c, `/tp ${x} ${y}`);
    await sleep(300);
    if (c.pos && Math.hypot(c.pos.x - x, c.pos.y - y) < 6) return;
  }
  throw new Error(`tp to ${x},${y} never landed`);
}

/** Wait for a system line matching the needle. */
async function line(c: Client, needle: string, from: number, label = needle): Promise<void> {
  await c.waitFor(
    (m) => m.t === 'chat' && m.channel === 'system' && String(m.text).includes(needle),
    label,
    8000,
    from,
  );
}

async function build(c: Client, buildable: string, tx: number, ty: number): Promise<void> {
  c.send({ t: 'build', buildable, tx, ty });
  // Build actions run 30-90 ticks; wait out the longest plus margin.
  await sleep(6000);
}

async function main(): Promise<void> {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  c.send({ t: 'register', user: USER, pass: 'proving123', name: CHAR });
  const welcome = await c.waitFor((m) => m.t === 'welcome', 'welcome (register)');
  c.eid = welcome.eid;
  console.log(`farmer ${USER} eid ${c.eid} on ${URL}`);
  // Keep the socket fed so snapshots flow.
  const heartbeat = setInterval(() => c.send({ t: 'input', frame: { seq: c.seq++, mx: 0, my: 0, aim: 0, buttons: 0 } }), 500);

  // Ground: a spread course west of Dawnmead's county, clear of towns.
  let bx = 160 + (Number(STAMP) % 97);
  let by = 40 + (Number(STAMP) % 61);
  await say(c, '/xp farming 50000');
  await say(c, '/xp construction 50000');
  await say(c, '/give watering_can');
  await say(c, '/give carrot_seed 6');
  await say(c, '/give plant_fibre 8');
  await say(c, '/give carrot 8');
  // Build materials: the bin (board 3 + twine 1) and the well
  // (copper_ore 2 + board 2 + twine 1).
  await say(c, '/give board 6');
  await say(c, '/give twine 3');
  await say(c, '/give copper_ore 2');
  await tp(c, bx, by);

  // ---- the tended plot -------------------------------------------
  // The random course can land on trees or water: hunt for a spot
  // where a plot builds AND a seed takes (the harness ground law).
  let p1x = 0;
  let p1y = 0;
  let planted = false;
  for (const [ox, oy] of [[0, 0], [-24, 15], [31, -12], [18, 22], [-35, -20], [44, 8]]) {
    await tp(c, bx + ox, by + oy);
    const fx = Math.floor(bx + ox) + 2;
    const fy = Math.floor(by + oy);
    await build(c, 'garden_plot', fx, fy);
    const mk0 = c.mark();
    c.send({ t: 'plant', tx: fx, ty: fy, seed: 'carrot_seed' });
    try {
      await line(c, 'You plant carrot', mk0, 'plant', );
      p1x = fx;
      p1y = fy;
      bx = bx + ox;
      by = by + oy;
      planted = true;
      break;
    } catch {
      // Refused ground — walk on to the next candidate field.
    }
  }
  receipt('the seed takes the furrow', planted);

  // Fertilize with an empty barrow: the refusal speaks, nothing spent.
  let mk = c.mark();
  c.send({ t: 'fertilize', tx: p1x, ty: p1y });
  await line(c, 'You need compost', mk, 'fertilize refusal');
  receipt('the empty barrow is refused aloud', true);

  // The bin pays the compost that feeds the soil (proving the whole
  // chain would wait on the batch — the lever hurries it below; for
  // the soil receipt the pantry lever hands compost straight over).
  await say(c, '/give compost 2');
  mk = c.mark();
  c.send({ t: 'fertilize', tx: p1x, ty: p1y });
  await line(c, 'You work compost into the soil', mk);
  let care = c.plotCare(p1x, p1y);
  receipt('compost enriches the row', care?.soil === 1, `soil=${care?.soil}`);

  mk = c.mark();
  c.send({ t: 'mulch', tx: p1x, ty: p1y });
  await line(c, 'You lay a fibre blanket', mk);
  care = c.plotCare(p1x, p1y);
  receipt('the mulch blanket lies', care?.m === 1);

  mk = c.mark();
  c.send({ t: 'interact', tx: p1x, ty: p1y });
  await line(c, 'You water the carrot', mk);
  care = c.plotCare(p1x, p1y);
  receipt('the sprout drinks and the mirror shows it', (care!.w & 1) === 1, `w=${care?.w}`);

  // Ripen and harvest: water(1) + soil(1) + mulch(1) = 3 → FINE.
  await say(c, '/grow');
  await sleep(2600);
  mk = c.mark();
  c.send({ t: 'interact', tx: p1x, ty: p1y });
  await line(c, 'A fine harvest', mk);
  receipt('THE CARE FOLD pays a fine harvest', c.count('carrot_fine') >= 2, `fine=${c.count('carrot_fine')}`);
  receipt('the mirror lets the harvested row go', c.plotCare(p1x, p1y) === null);

  // ---- the bin ----------------------------------------------------
  // Build beside the FEET, not a hoped-for landing: /tp is loose (a
  // within-6 snap), and both the build door and the deposit door
  // measure the true 2.2 reach. Probe candidates with one carrot
  // until a bin answers on the mirror.
  let binX = 0;
  let binY = 0;
  let binUp = false;
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
    const fx = Math.floor(c.pos!.x) + ox;
    const fy = Math.floor(c.pos!.y) + oy;
    await build(c, 'compost_bin', fx, fy);
    const slots0 = c.inv();
    const probe = slots0.findIndex((s) => s && s.item === 'carrot');
    if (probe === -1) throw new Error('no probe carrot left');
    c.send({ t: 'compostadd', tx: fx, ty: fy, slot: probe });
    await sleep(600);
    if (c.binState(fx, fy) !== null) {
      binX = fx;
      binY = fy;
      binUp = true;
      break;
    }
  }
  receipt('a bin stands and takes its first scrap', binUp);
  // Feed the rest of the batch: plain carrots at one measure each,
  // the fine harvest's grades riding in beside them.
  for (let round = 0; round < 12; round++) {
    const st = c.binState(binX, binY);
    if (st && st.readyAt > 0) break;
    const slots = c.inv();
    const idx = slots.findIndex(
      (s) => s && (s.item === 'carrot' || s.item === 'carrot_fine' || s.item === 'carrot_prime'),
    );
    if (idx === -1) break;
    c.send({ t: 'compostadd', tx: binX, ty: binY, slot: idx });
    await sleep(260);
  }
  const bin = c.binState(binX, binY);
  receipt('the heap closes its lid at the batch', bin !== null && bin.readyAt > 0, `fill=${bin?.fill}`);

  mk = c.mark();
  const slots = c.inv();
  const spareIdx = slots.findIndex((s) => s && s.item === 'plant_fibre');
  c.send({ t: 'compostadd', tx: binX, ty: binY, slot: spareIdx });
  await line(c, 'The bin is working', mk);
  receipt('a working bin refuses more scraps aloud', true);

  await say(c, '/grow');
  mk = c.mark();
  c.send({ t: 'interact', tx: binX, ty: binY });
  await line(c, 'You turn out', mk, 'compost turn-out');
  receipt(
    'the hurried batch turns out compost',
    c.count('compost') + c.count('prime_compost') >= 1,
    `compost=${c.count('compost')} prime=${c.count('prime_compost')}`,
  );

  // ---- the well's sweep ------------------------------------------
  // Everything beside the feet again: the well one east, the two
  // sweep beds adjacent west so both sit inside one 3x3.
  const fx = Math.floor(c.pos!.x);
  const fy = Math.floor(c.pos!.y);
  const s1 = { x: fx - 1, y: fy };
  const s2 = { x: fx - 1, y: fy + 1 };
  await build(c, 'well', fx + 1, fy - 1);
  await build(c, 'garden_plot', s1.x, s1.y);
  await build(c, 'garden_plot', s2.x, s2.y);
  c.send({ t: 'plant', tx: s1.x, ty: s1.y, seed: 'carrot_seed' });
  await sleep(400);
  c.send({ t: 'plant', tx: s2.x, ty: s2.y, seed: 'carrot_seed' });
  await sleep(400);
  mk = c.mark();
  c.send({ t: 'interact', tx: s1.x, ty: s1.y });
  await line(c, 'You draw from the well', mk);
  await sleep(400);
  const c1 = c.plotCare(s1.x, s1.y);
  const c2 = c.plotCare(s2.x, s2.y);
  receipt(
    "the well's reach waters the whole bed",
    (c1!.w & 1) === 1 && (c2!.w & 1) === 1,
    `w1=${c1?.w} w2=${c2?.w}`,
  );

  // ---- the fed channel -------------------------------------------
  // A channel beside the well, a bed beside the channel, and NOBODY
  // watering: the crop beat must slake the sprout on its own (and
  // pay no one — the automation law's other half is the xp ledger,
  // pinned by the unit tests).
  // South lane: (fx+1, fy) is the bin's own tile — the yard is real
  // and the trench digs around it, exactly like a player would.
  await build(c, 'irrigation_channel', fx, fy + 1);
  const a1 = { x: fx, y: fy + 2 };
  await build(c, 'garden_plot', a1.x, a1.y);
  // Stand ON the channel to plant the bed below it — walkable by
  // law (you step over a trench), and standing there proves it.
  for (let i = 0; i < 4; i++) {
    await say(c, `/tp ${fx} ${fy + 1}`);
    await sleep(300);
    if (c.pos && Math.hypot(c.pos.x - (a1.x + 0.5), c.pos.y - (a1.y + 0.5)) < 2.0) break;
  }
  const mkA = c.mark();
  c.send({ t: 'plant', tx: a1.x, ty: a1.y, seed: 'carrot_seed' });
  await line(c, 'You plant carrot', mkA, 'channel bed plant');
  await sleep(3600); // one crop beat (2s) plus margin
  const ac = c.plotCare(a1.x, a1.y);
  receipt('the fed channel waters the bed itself', (ac!.w & 1) === 1, `w=${ac?.w}`);

  clearInterval(heartbeat);
  console.log(`\nTHE LIVING SOIL: ${passed} receipts, all honest.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
