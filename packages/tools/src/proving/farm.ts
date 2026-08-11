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
/** Chapter select: all | field (Ph2+3) | yard (Ph3 only) — the
 * prove:tongue fast-lane law: iterate on one chapter, run the whole
 * book before any commit. */
const FROM = process.env.ARX_PROVE_FROM ?? 'all';
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
  /** Latest sampled position per visible entity (the herd wanders). */
  ents = new Map<number, Sample>();
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
          this.ents.set(e.eid, { x: e.x, y: e.y, at: Date.now() });
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
  try {
    await c.waitFor(
      (m) => m.t === 'chat' && m.channel === 'system' && String(m.text).includes(needle),
      label,
      8000,
      from,
    );
  } catch (err) {
    // The refusal that DID speak is the diagnosis — print it before
    // the timeout walks up the stack.
    const spoken = c.msgs
      .slice(from)
      .filter((m) => m.t === 'chat' && m.channel === 'system')
      .map((m) => m.text)
      .slice(-4);
    console.log(`  [line] waiting '${needle}', heard: ${spoken.join(' | ') || '(silence)'}`);
    throw err;
  }
}

async function build(c: Client, buildable: string, tx: number, ty: number): Promise<void> {
  c.send({ t: 'build', buildable, tx, ty });
  // Build actions run 30-90 ticks; wait out the longest plus margin.
  await sleep(6000);
}

/**
 * THE GROUND LOTTERY, tamed once: raise a bed and plant into it at
 * the first candidate spot that takes (the plant line is the proof —
 * a refused build or bad ground never speaks it). Returns the spot.
 */
async function stagePlanting(
  c: Client,
  bed: string,
  seed: string,
  needle: string,
  spots: Array<[number, number]>,
): Promise<{ x: number; y: number }> {
  for (const [sx, sy] of spots) {
    // Stand hard beside the spot first: /tp lands loose (within 6),
    // and both the build door and the plant door measure true reach.
    let near = false;
    for (let i = 0; i < 3 && !near; i++) {
      await say(c, `/tp ${sx} ${sy + 1}`);
      await sleep(300);
      near = !!c.pos && Math.hypot(c.pos.x - (sx + 0.5), c.pos.y - (sy + 0.5)) < 2.0;
    }
    if (!near) continue;
    await build(c, bed, sx, sy);
    const mk0 = c.mark();
    c.send({ t: 'plant', tx: sx, ty: sy, seed });
    try {
      await line(c, needle, mk0, `${seed} at ${sx},${sy}`);
      return { x: sx, y: sy };
    } catch {
      // Refused ground — the next candidate. Say why (the spoken
      // refusal is the diagnosis; silence means a silent door).
      const spoken = c.msgs
        .slice(mk0)
        .filter((m) => m.t === 'chat' && m.channel === 'system')
        .map((m) => m.text)
        .slice(-2);
      console.log(`  [stage] ${seed} at ${sx},${sy} refused: ${spoken.join(' | ') || '(silence)'}`);
    }
  }
  throw new Error(`no ground took ${seed}`);
}


/** Step hard beside a wandering body before asking anything of it. */
async function sidle(c: Client, targetEid: number): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const at = c.ents.get(targetEid);
    if (!at) {
      await sleep(400);
      continue;
    }
    await say(c, `/tp ${Math.round(at.x)} ${Math.round(at.y) + 1}`);
    await sleep(300);
    const again = c.ents.get(targetEid);
    if (c.pos && again && Math.hypot(c.pos.x - again.x, c.pos.y - again.y) < 1.9) return;
  }
}


/**
 * Ask a wandering animal for a spoken outcome: sidle, act, and if
 * the wire stays silent (the body drifted out of the reach window
 * between sample and press), sidle again and re-ask.
 */
async function stockAct(c: Client, targetEid: number, needle: string, label = needle): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sidle(c, targetEid);
    const mk0 = c.mark();
    c.send({ t: 'interactnpc', eid: targetEid });
    try {
      await c.waitFor(
        (m) => m.t === 'chat' && m.channel === 'system' && String(m.text).includes(needle),
        label,
        5000,
        mk0,
      );
      return;
    } catch {
      // Drifted — step in again.
    }
  }
  throw new Error(`stockAct never heard '${needle}'`);
}

async function main(): Promise<void> {
  let hb2: ReturnType<typeof setInterval> | null = null;
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
  await say(c, '/clearfarm 12');

  if (FROM === 'all') {
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
  // Two proven beds inside one 3x3, then wells hammered at every
  // candidate around them — ANY standing well within reach arms the
  // sweep, so redundancy beats verification the wire cannot do.
  const fx0 = Math.floor(c.pos!.x);
  const fy0 = Math.floor(c.pos!.y);
  const s1 = await stagePlanting(c, 'garden_plot', 'carrot_seed', 'You plant carrot', [
    [fx0 - 1, fy0],
    [fx0 + 3, fy0],
    [fx0, fy0 - 3],
    [fx0 - 3, fy0 + 2],
  ]);
  let s2: { x: number; y: number } | null = null;
  for (const [dx2, dy2] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) {
    try {
      s2 = await stagePlanting(c, 'garden_plot', 'carrot_seed', 'You plant carrot', [
        [s1.x + dx2!, s1.y + dy2!],
      ]);
      break;
    } catch {
      // That neighbor refused — try the next.
    }
  }
  if (!s2) throw new Error('no second sweep bed took');
  for (const [wx2, wy2] of [
    [s1.x + 2, s1.y - 2],
    [s1.x - 2, s1.y - 2],
    [s1.x + 3, s1.y + 1],
  ]) {
    let near = false;
    for (let i = 0; i < 2 && !near; i++) {
      await say(c, `/tp ${wx2} ${wy2! + 1}`);
      await sleep(300);
      near = !!c.pos && Math.hypot(c.pos.x - (wx2! + 0.5), c.pos.y - (wy2! + 0.5)) < 2.5;
    }
    if (near) await build(c, 'well', wx2!, wy2!);
  }
  await tp(c, s1.x, s1.y + 1);
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
  // pinned by the unit tests). Anchored off the proven sweep bed —
  // the wells above serve every trench candidate. The probe is
  // END-TO-END per cluster: a trench the wire cannot verify is
  // proved by the bed it waters, or the next cluster tries.
  await say(c, '/give carrot_seed 4');
  const fx = s1.x;
  const fy = s1.y + 1;
  let fedBed: { x: number; y: number; w: number } | null = null;
  clusters: for (const [cdx, cdy] of [[0, 1], [1, 1], [-1, 1], [2, 0]]) {
    const chx = fx + cdx!;
    const chy = fy + cdy!;
    // Stand BESIDE the trench line, never on it — a builder digs no
    // trench under his own boots.
    let near = false;
    for (let i = 0; i < 2 && !near; i++) {
      await say(c, `/tp ${chx - 1} ${chy}`);
      await sleep(300);
      near = !!c.pos && Math.hypot(c.pos.x - (chx + 0.5), c.pos.y - (chy + 0.5)) < 2.0;
    }
    if (!near) continue;
    await build(c, 'irrigation_channel', chx, chy);
    for (const [bdx, bdy] of [[0, 1], [1, 0], [1, 1]]) {
      let bed: { x: number; y: number };
      try {
        bed = await stagePlanting(c, 'garden_plot', 'carrot_seed', 'You plant carrot', [
          [chx + bdx!, chy + bdy!],
        ]);
      } catch {
        continue;
      }
      await sleep(3600); // one crop beat (2s) plus margin
      const care = c.plotCare(bed.x, bed.y);
      if (care && (care.w & 1) === 1) {
        fedBed = { x: bed.x, y: bed.y, w: care.w };
        break clusters;
      }
      // A planted-but-dry bed means THIS trench never stood — walk
      // on to the next cluster (the dry bed stays, harmless).
    }
  }
  receipt('the fed channel waters the bed itself', fedBed !== null, `w=${fedBed?.w}`);

  } // end Phase 1 chapter

  if (FROM !== 'yard') {
  // ================= THE FULL FIELD (Phase 2) =====================
  // A fresh orchardist with a clean pack (the first farmer's slots
  // are full of honest harvest litter — a real lesson: non-stackable
  // produce fills 28 slots fast).
  const oc = new Client();
  await oc.open();
  oc.send({ t: 'hello', v: PROTOCOL_VERSION });
  oc.send({ t: 'register', user: `orchard_${STAMP}`, pass: 'proving123', name: `Orchard ${STAMP}` });
  const w2 = await oc.waitFor((m) => m.t === 'welcome', 'welcome (orchardist)');
  oc.eid = w2.eid;
  hb2 = setInterval(() => oc.send({ t: 'input', frame: { seq: oc.seq++, mx: 0, my: 0, aim: 0, buttons: 0 } }), 500);
  await say(oc, '/xp farming 2000000');
  await say(oc, '/xp construction 100000');
  await say(oc, '/give apple_sapling 2');
  await say(oc, '/give palegill_spores 2');
  await say(oc, '/give log 2');
  await say(oc, '/give board 6');
  await say(oc, '/give cloth 2');
  await say(oc, '/give carrot_seed 3');
  receipt('the orchardist packs true', oc.count('apple_sapling') === 2 && oc.count('palegill_spores') === 2, `sap=${oc.count('apple_sapling')} spores=${oc.count('palegill_spores')}`);
  // The orchardist lands on a fresh course and FLATTENS it — the
  // proving-ground lever retired the terrain lottery (and with it
  // the ten-minute suite).
  await tp(oc, bx + 26, by + 20);
  await say(oc, '/clearfarm 10');
  const ofx = Math.floor(oc.pos!.x) + 2;
  const ofy = Math.floor(oc.pos!.y);
  await tp(oc, ofx - 1, ofy);

  // ---- the orchard shape -----------------------------------------
  const orchard = await stagePlanting(oc, 'garden_plot', 'apple_sapling', 'You plant apple tree', [
    [ofx, ofy + 1],
    [ofx - 1, ofy - 1],
    [ofx - 2, ofy],
    [ofx, ofy - 1],
  ]);
  const ox = orchard.x;
  const oy = orchard.y;
  let mko = oc.mark();
  await say(oc, '/grow');
  await sleep(2600);
  const applesBefore = oc.count('apple');
  oc.send({ t: 'interact', tx: ox, ty: oy });
  await sleep(2500);
  receipt('the orchard pays its first pick', oc.count('apple') > applesBefore, `apples=${oc.count('apple')}`);

  // The tree STANDS: prune it mid-cycle, then pick again.
  mko = oc.mark();
  oc.send({ t: 'prune', tx: ox, ty: oy });
  await line(oc, 'You cut the deadwood away', mko);
  receipt('the knife finds standing wood (the tree survived the pick)', true);
  mko = oc.mark();
  oc.send({ t: 'prune', tx: ox, ty: oy });
  await line(oc, 'The wood is already clean', mko);
  receipt('the knife refuses a second cut aloud', true);
  await say(oc, '/grow');
  await sleep(2600);
  const applesMid = oc.count('apple');
  oc.send({ t: 'interact', tx: ox, ty: oy });
  await sleep(2500);
  receipt('the second season pays again', oc.count('apple') > applesMid, `apples=${oc.count('apple')}`);

  // ---- the dark bed ----------------------------------------------
  const logBed = await stagePlanting(oc, 'mushroom_log', 'palegill_spores', 'You plant palegill', [
    [ofx - 2, ofy],
    [ofx - 1, ofy - 1],
    [ofx - 2, ofy - 1],
    [ofx - 2, ofy + 1],
  ]);
  const lx = logBed.x;
  const ly = logBed.y;
  mko = oc.mark();
  oc.send({ t: 'fertilize', tx: lx, ty: ly });
  await line(oc, 'The log asks for shade', mko);
  receipt('the dark bed refuses the barrow aloud', true);
  await say(oc, '/grow');
  await sleep(2600);
  oc.send({ t: 'interact', tx: lx, ty: ly });
  await sleep(2500);
  receipt('the log pays in reagents', oc.count('spore_dust') >= 2, `dust=${oc.count('spore_dust')}`);

  // ---- the growing frame -----------------------------------------
  // The frame builds ON a plot (its one legal ground), so the stage
  // is: plot, frame over it, then the seed into the frame.
  let frame: { x: number; y: number } | null = null;
  for (const [gx2, gy2] of [
    [ofx - 1, ofy + 1],
    [ofx - 2, ofy + 1] as [number, number],
    [ofx, ofy + 2] as [number, number],
  ] as Array<[number, number]>) {
    let near = false;
    for (let i = 0; i < 3 && !near; i++) {
      await say(oc, `/tp ${gx2} ${gy2 + 1}`);
      await sleep(300);
      near = !!oc.pos && Math.hypot(oc.pos.x - (gx2 + 0.5), oc.pos.y - (gy2 + 0.5)) < 2.0;
    }
    if (!near) continue;
    await build(oc, 'garden_plot', gx2, gy2);
    await build(oc, 'growing_frame', gx2, gy2);
    const mkF = oc.mark();
    oc.send({ t: 'plant', tx: gx2, ty: gy2, seed: 'carrot_seed' });
    try {
      await line(oc, 'You plant carrot', mkF, 'frame plant');
      frame = { x: gx2, y: gy2 };
      break;
    } catch {
      // Refused ground — the next candidate.
    }
  }
  if (!frame) throw new Error('no frame ground found');
  await sleep(3600); // one crop beat: the frame waters its own
  const fc = oc.plotCare(frame.x, frame.y);
  receipt('the frame marks its row and waters it', fc !== null && fc.w >= 1 && (fc as any).f === 1, `w=${fc?.w} f=${(fc as any)?.f}`);

  } // end Phase 2 chapter

  // ================= THE ANIMALS OF THE YARD (Phase 3) =============
  // A fresh drover with a clean pack, on the orchardist's proven
  // ground (the yard rises where the field already took).
  const dc = new Client();
  await dc.open();
  dc.send({ t: 'hello', v: PROTOCOL_VERSION });
  dc.send({ t: 'register', user: `drover_${STAMP}`, pass: 'proving123', name: `Drover ${STAMP}` });
  const w3 = await dc.waitFor((m) => m.t === 'welcome', 'welcome (drover)');
  dc.eid = w3.eid;
  const hb3 = setInterval(() => dc.send({ t: 'input', frame: { seq: dc.seq++, mx: 0, my: 0, aim: 0, buttons: 0 } }), 500);
  await say(dc, '/give board 3');
  await say(dc, '/give twine 1');
  await say(dc, '/give chick_crate');
  await say(dc, '/give barley 2');
  // The landing itself can hit water or rock — walk the courses.
  {
    let landed = false;
    for (const [yx, yy] of [[52, 40], [58, 30], [44, 52], [66, 44], [38, 26]]) {
      try {
        await tp(dc, bx + yx!, by + yy!);
        landed = true;
        break;
      } catch {
        // Refused ground — the next course.
      }
    }
    if (!landed) throw new Error('no yard course landed');
  }
  await say(dc, '/clearfarm 8');

  // A crate opened in the open field speaks its refusal, crate kept.
  let mkd = dc.mark();
  {
    const crateSlot = dc.inv().findIndex((s) => s && s.item === 'chick_crate');
    dc.send({ t: 'use', slot: crateSlot });
    await line(dc, 'Release it at your own feed trough', mkd);
    receipt('the crate waits on a trough, spoken', dc.count('chick_crate') === 1);
  }

  // Raise the trough beside the feet, then the release ceremony.
  const dfx = Math.floor(dc.pos!.x) + 1;
  const dfy = Math.floor(dc.pos!.y);
  await build(dc, 'feed_trough', dfx, dfy);
  mkd = dc.mark();
  {
    const crateSlot = dc.inv().findIndex((s) => s && s.item === 'chick_crate');
    dc.send({ t: 'use', slot: crateSlot });
    await line(dc, 'steps into your yard', mkd);
  }
  const ceremony = await dc.waitFor((m) => m.t === 'stockname', 'naming ceremony', 4000, mkd);
  receipt('the release ceremony asks a name', ceremony.species === 'chicken');
  dc.send({ t: 'stockname', slot: ceremony.slot, name: 'Henrietta' });
  await line(dc, 'Henrietta it is', mkd);
  receipt('the name sticks through the sanitize law', true);

  // Unfed first collect: plain egg (the fold is honest about zero).
  await say(dc, '/grow');
  await sleep(600);
  const henEid = () => {
    // MY hen only: a persistent rig keeps every previous run's yard
    // alive (their Henriettas included) — ownerEid is the tell, and
    // it rides the meta exactly while the keeper is online.
    let found = -1;
    for (const m of dc.msgs) {
      if (m.t !== 'enter' && m.t !== 'update') continue;
      for (const en of m.entities ?? []) {
        if (en.defId === 'chicken' && en.name === 'Henrietta' && en.ownerEid === dc.eid) {
          found = en.eid;
        }
      }
    }
    return found;
  };
  const hen = henEid();
  receipt('Henrietta stands in the world wearing her name', hen >= 0, `eid=${hen}`);
  await stockAct(dc, hen, 'gather Henrietta', 'unfed gather');
  receipt('the unfed yard pays plain', dc.count('egg') >= 1, `egg=${dc.count('egg')}`);

  // Feed the manger (mirror shows it), hurry the clock, collect FINE.
  // Back to the trough first — the hen led us wherever she pleased.
  for (let i = 0; i < 3; i++) {
    await say(dc, `/tp ${dfx} ${dfy + 1}`);
    await sleep(300);
    if (dc.pos && Math.hypot(dc.pos.x - (dfx + 0.5), dc.pos.y - (dfy + 0.5)) < 2.0) break;
  }
  mkd = dc.mark();
  {
    const feedSlot = dc.inv().findIndex((s) => s && s.item === 'barley');
    dc.send({ t: 'troughadd', tx: dfx, ty: dfy, slot: feedSlot });
    await line(dc, 'You fill the manger', mkd);
  }
  await sleep(400);
  const troughState = (() => {
    let feed = 0;
    for (const m of dc.msgs) {
      if (m.t !== 'farm') continue;
      for (const tr of m.troughs ?? []) if (tr.tx === dfx && tr.ty === dfy) feed = tr.feed;
    }
    return feed;
  })();
  receipt('the manger mirror counts its measures', troughState >= 2, `feed=${troughState}`);
  await say(dc, '/grow');
  await sleep(600);
  await stockAct(dc, hen, 'gives well today', 'fed collect');
  receipt("THE YARD'S CARE FOLD pays a fine egg when fed", dc.count('egg_fine') >= 1, `fine=${dc.count('egg_fine')}`);

  // The brush moment (produce not ready — the cascade brushes).
  await stockAct(dc, hen, 'You brush Henrietta', 'brush moment');
  receipt('the brush pays the bond, positive-only', true);

  // The lead walks her home: refund spoken, yard emptied. Bought
  // only now — the cascade lets it fire only when nothing else
  // offers, and the brush above just closed its own window.
  await say(dc, '/give drovers_lead');
  await stockAct(dc, hen, 'lead Henrietta back to the drover trade');
  receipt('the lead walks one home at half worth', dc.count('drovers_lead') === 0 && dc.count('coins') >= 15, `coins=${dc.count('coins')}`);

  clearInterval(heartbeat);
  if (hb2) clearInterval(hb2);
  clearInterval(hb3);
  console.log(`\nTHE SOIL, THE FIELD, AND THE YARD: ${passed} receipts, all honest.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
