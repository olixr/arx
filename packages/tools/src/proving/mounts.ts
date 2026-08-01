/**
 * THE PROVING — live receipts for THE SADDLE LAW (docs/mounts-plan.md
 * Phase 1), driven over the real wire against the running dev server.
 * Registers a throwaway account and rides the whole law: the join
 * mirror, the empty whistle, the dev whistle, the Ride pose byte, the
 * measured stride (max-not-product against a live tonic), and every
 * dismount trigger — deed, crouch, dodge, dungeon ground, damage.
 *
 * Usage (against a running dev server):
 *   npm run prove:mounts -w @arx/tools
 */
import WebSocket from 'ws';
import { ByteReader, BinaryMsgType, decodeSnapshot, PROTOCOL_VERSION, PoseState } from '@arx/shared';

const URL = 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));
const USER = `saddle_${STAMP}`;
const CHAR = `Saddle ${STAMP}`;

type Msg = Record<string, any>;
const ATTACK = 1 << 0;
const DODGE = 1 << 2;
const SNEAK = 1 << 7;
const SIT = 1 << 8;
const MOUNT = 1 << 10;

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  seq = 1;
  eid = -1;
  /** Latest authoritative own position, stamped on arrival. */
  pos: { x: number; y: number; pose: number; at: number } | null = null;
  /** THE NEIGHBOR RIDES: another eid this client is watching. */
  watchEid = -1;
  watched: Array<{ x: number; y: number; pose: number; at: number }> = [];
  open(): Promise<void> {
    this.ws = new WebSocket(URL);
    this.ws.on('message', (d: Buffer, isBinary: boolean) => {
      if (isBinary) {
        const buf = new Uint8Array(d).buffer;
        const r = new ByteReader(buf);
        if (r.u8() !== BinaryMsgType.Snapshot) return;
        const snap = decodeSnapshot(r);
        for (const e of snap.entities) {
          if (e.eid === this.eid) {
            this.pos = { x: e.x, y: e.y, pose: e.pose, at: Date.now() };
          }
          if (e.eid === this.watchEid) {
            this.watched.push({ x: e.x, y: e.y, pose: e.pose, at: Date.now() });
          }
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
  frame(buttons: number, mx = 0, my = 0, aim = 0): void {
    this.send({ t: 'input', frame: { seq: this.seq++, mx, my, aim, buttons } });
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

async function tp(c: Client, x: number, y: number): Promise<void> {
  c.send({ t: 'chat', text: `/tp ${x} ${y}` });
  await sleep(400);
}

/**
 * Run due east under continuous input, measuring the PEAK SUSTAINED
 * speed from authoritative snapshots: the best >=450ms window of the
 * run. The world grows (THE SECOND GROWTH) — a sapling in the course
 * or a server hiccup must not read as a slow body, so the whole-run
 * average is the wrong instrument; the best clean window is the law.
 */
async function measureRun(c: Client, secs: number): Promise<number> {
  await sleep(250);
  if (!c.pos) throw new Error('no snapshot yet — cannot measure');
  const samples: Array<{ x: number; y: number; at: number }> = [];
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    c.frame(0, 1, 0);
    if (c.pos) samples.push({ x: c.pos.x, y: c.pos.y, at: c.pos.at });
    await sleep(50);
  }
  c.frame(0);
  await sleep(250);
  if (c.pos) samples.push({ x: c.pos.x, y: c.pos.y, at: c.pos.at });
  let best = 0;
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const dt = (samples[j]!.at - samples[i]!.at) / 1000;
      if (dt < 0.45) continue;
      const d = Math.hypot(samples[j]!.x - samples[i]!.x, samples[j]!.y - samples[i]!.y);
      best = Math.max(best, d / dt);
    }
  }
  return best;
}

async function mountUp(c: Client): Promise<void> {
  const mark = c.mark();
  await c.press(MOUNT);
  await c.waitFor((m) => m.t === 'ride' && m.mount === 'courser_bay', 'saddle up', 4000, mark);
}

async function expectDismount(c: Client, why: string, mark: number): Promise<void> {
  const m = await c.waitFor((mm) => mm.t === 'ride' && mm.mount === null, `dismount on ${why}`, 4000, mark);
  receipt(`${why} puts boots on the ground`, m.mount === null && m.mult !== undefined);
}

const main = async () => {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  c.send({ t: 'register', user: USER, pass: 'proving123', name: CHAR });
  const welcome = await c.waitFor((m) => m.t === 'welcome', 'welcome (register)');
  c.eid = welcome.eid;

  // --- The join mirror: afoot, mult 1, nothing owned.
  const first = await c.waitFor((m) => m.t === 'ride', 'join ride mirror');
  receipt(
    'THE PREDICTOR LEARNS ITS LEGS: the mirror arrives on join',
    first.mount === null && first.mult === 1 && Array.isArray(first.owned) && first.owned.length === 0,
  );

  // --- The empty whistle speaks.
  let mark = c.mark();
  await c.press(MOUNT);
  await c.waitFor(
    (m) => m.t === 'chat' && /no mount to call/.test(m.text ?? ''),
    'empty whistle line',
    4000,
    mark,
  );
  receipt('the empty whistle answers in the quartermaster voice', true);

  // --- The dev whistle: grant + choose + saddle up.
  mark = c.mark();
  c.send({ t: 'chat', text: '/mount courser_bay' });
  const ride = await c.waitFor((m) => m.t === 'ride' && m.mount === 'courser_bay', 'saddled', 4000, mark);
  receipt(
    'the dev whistle saddles the courser',
    ride.mult === 1.6 && ride.owned.includes('courser_bay'),
    `mult ${ride.mult}`,
  );

  // --- The pose byte says Ride.
  await sleep(400);
  receipt('the pose byte reads Ride', c.pos?.pose === PoseState.Ride, `pose ${c.pos?.pose}`);

  // --- Find honest ground: afoot must measure close to base speed.
  c.send({ t: 'chat', text: '/mount off' });
  await sleep(300);
  let course: [number, number] | null = null;
  let afoot = 0;
  // Jittered per run: proving wolves (the damage receipt) leash where
  // they spawned, and a fixed course collects them run over run.
  const jit = Number(STAMP) % 11;
  for (const cand of [
    [200 + jit, 60 + jit],
    [240 + jit, 100],
    [160, 130 + jit],
    [280, 90 + jit],
    [220 + jit, 140],
    [180, 90 + jit],
  ] as Array<[number, number]>) {
    await tp(c, cand[0], cand[1]);
    afoot = await measureRun(c, 1.8);
    if (afoot > 4.5 && afoot < 5.5) {
      course = cand;
      break;
    }
  }
  if (!course) throw new Error(`no open course found (last afoot ${afoot.toFixed(2)} t/s)`);
  receipt('the course is honest: afoot near base speed', true, `${afoot.toFixed(2)} t/s`);

  // --- THE SADDLE OUTRANKS THE SOLES, measured on the same ground.
  await tp(c, course[0], course[1]);
  await mountUp(c);
  const mounted = await measureRun(c, 1.4);
  const ratio = mounted / afoot;
  receipt(
    'the saddle outranks the soles on real ground',
    ratio > 1.45 && ratio < 1.75,
    `${mounted.toFixed(2)} t/s, ratio ${ratio.toFixed(2)}`,
  );

  // --- A live tonic must NOT stack past the saddle (max, not product).
  mark = c.mark();
  c.send({ t: 'chat', text: '/give swiftness_tonic 1' });
  const inv = await c.waitFor((m) => m.t === 'inv', 'tonic in pack', 4000, mark);
  const slot = inv.slots.findIndex((s: any) => s && s.item === 'swiftness_tonic');
  mark = c.mark();
  c.send({ t: 'use', slot });
  await c.waitFor((m) => m.t === 'buffs' && m.buffs?.some((b: any) => /Swift/.test(b.name)), 'tonic buff', 4000, mark);
  await sleep(500);
  const rideNow = c.latest('ride');
  receipt(
    'a tonic in the saddle changes nothing: max, never product',
    rideNow?.mult === 1.6,
    `mult ${rideNow?.mult}`,
  );

  // --- ...and the tonic outlives the saddle: dismount hands the legs back.
  mark = c.mark();
  await c.press(SIT); // the sit press steps down first
  const afterSit = await c.waitFor((m) => m.t === 'ride' && m.mount === null, 'sit dismount', 4000, mark);
  receipt('the sit press steps down, tonic legs restored', Math.abs(afterSit.mult - 1.2) < 1e-9, `mult ${afterSit.mult}`);

  // --- The second sit press actually sits.
  await c.press(SIT);
  await sleep(400);
  receipt('the second press takes the wayside rest', c.pos?.pose === PoseState.Sit, `pose ${c.pos?.pose}`);
  await c.press(SIT); // stand back up

  // --- Every deed dismounts: attack, sneak, dodge.
  await mountUp(c);
  mark = c.mark();
  await c.press(ATTACK);
  await expectDismount(c, 'a swing', mark);

  await mountUp(c);
  mark = c.mark();
  c.frame(SNEAK, 0.4, 0);
  await sleep(150);
  c.frame(0);
  await expectDismount(c, 'the crouch', mark);

  await mountUp(c);
  mark = c.mark();
  c.frame(DODGE, 1, 0);
  await sleep(150);
  c.frame(0);
  await expectDismount(c, 'the dodge', mark);

  // --- The underground refuses the saddle (the Undercroft landing —
  // real dark-band ground; raw dungeon-band space has no floor to tp to).
  await tp(c, -330, 552);
  await sleep(300);
  if ((c.pos?.y ?? 0) < 512) throw new Error('tp to the Undercroft landing missed');
  mark = c.mark();
  await c.press(MOUNT);
  await c.waitFor((m) => m.t === 'chat' && /No room to ride/.test(m.text ?? ''), 'underground refusal', 4000, mark);
  receipt('the underground refuses the saddle, aloud', true);
  await tp(c, course[0], course[1]);

  // --- THE NEIGHBOR RIDES: a second client must see the saddle on
  // the wire — the mount id on appearance, the Ride pose byte, and
  // the full stride through its own raw snapshots.
  const b = new Client();
  await b.open();
  b.send({ t: 'hello', v: PROTOCOL_VERSION });
  b.send({ t: 'register', user: `watch_${STAMP}`, pass: 'proving123', name: `Watch ${STAMP}` });
  const bWelcome = await b.waitFor((m) => m.t === 'welcome', 'observer welcome');
  b.eid = bWelcome.eid;
  b.send({ t: 'chat', text: `/tp ${course[0]} ${course[1] + 2}` });
  await sleep(600);
  await mountUp(c);
  const seen = await b.waitFor(
    (m) =>
      (m.t === 'enter' || m.t === 'update') &&
      m.entities?.some((en: Msg) => en.appearance?.mount === 'courser_bay'),
    'observer sees the saddle',
    6000,
  );
  const riderMeta = seen.entities.find((en: Msg) => en.appearance?.mount === 'courser_bay');
  b.watchEid = riderMeta.eid;
  receipt('the neighbor sees WHAT is ridden on appearance', riderMeta.eid === c.eid);
  // A gallops; B measures the stride from its own snapshot stream.
  b.watched.length = 0;
  const tg0 = Date.now();
  while (Date.now() - tg0 < 1600) {
    c.frame(0, 1, 0);
    await sleep(50);
  }
  c.frame(0);
  await sleep(300);
  let remotePeak = 0;
  let sawRidePose = false;
  for (let i = 0; i < b.watched.length; i++) {
    if (b.watched[i]!.pose === PoseState.Ride) sawRidePose = true;
    for (let j = i + 1; j < b.watched.length; j++) {
      const dt = (b.watched[j]!.at - b.watched[i]!.at) / 1000;
      if (dt < 0.45) continue;
      const d = Math.hypot(b.watched[j]!.x - b.watched[i]!.x, b.watched[j]!.y - b.watched[i]!.y);
      remotePeak = Math.max(remotePeak, d / dt);
    }
  }
  receipt('the neighbor reads the Ride pose byte', sawRidePose);
  receipt(
    'the neighbor rides at full stride on the remote lane',
    remotePeak > 7.0 && remotePeak < 8.8,
    `${remotePeak.toFixed(2)} t/s (lane ceiling 12)`,
  );
  // The step-down reaches the neighbor too.
  let mark2 = b.mark();
  await c.press(SIT);
  await b.waitFor(
    (m) =>
      m.t === 'update' &&
      m.entities?.some((en: Msg) => en.eid === c.eid && en.appearance && !en.appearance.mount),
    'observer sees the dismount',
    6000,
    mark2,
  );
  receipt('the neighbor sees the boots come down', true);
  b.ws.close();

  // --- Landed damage unhorses the rider (last: it invites a wolf —
  // spawned far OFF the course so reruns never inherit the pack).
  await tp(c, course[0] - 40, course[1] + 30);
  await mountUp(c);
  mark = c.mark();
  c.send({ t: 'chat', text: '/spawnmob wolf' });
  await c.waitFor((m) => m.t === 'ride' && m.mount === null, 'damage dismount', 12000, mark);
  receipt('a landed blow unhorses the rider', true);

  // --- THE STABLE DOOR: the real player path (no dev whistle) — the
  // saddle paper grants the beast, P calls it, and the string SURVIVES
  // a full logout: the DB is the stable.
  const d = new Client();
  await d.open();
  d.send({ t: 'hello', v: PROTOCOL_VERSION });
  d.send({ t: 'register', user: `stable_${STAMP}`, pass: 'proving123', name: `Stable ${STAMP}` });
  const dw = await d.waitFor((m) => m.t === 'welcome', 'stable welcome');
  d.eid = dw.eid;
  await sleep(400);
  let dm = d.mark();
  d.send({ t: 'chat', text: '/give bay_courser 1' });
  const dinv = await d.waitFor((m) => m.t === 'inv', 'saddle paper in pack', 4000, dm);
  const dslot = dinv.slots.findIndex((s: any) => s && s.item === 'bay_courser');
  dm = d.mark();
  d.send({ t: 'use', slot: dslot });
  await d.waitFor((m) => m.t === 'chat' && /is yours/.test(m.text ?? ''), 'grant ceremony', 4000, dm);
  const dRide = await d.waitFor(
    (m) => m.t === 'ride' && m.owned?.includes('courser_bay'),
    'granted mirror',
    4000,
    dm,
  );
  receipt('the saddle paper brings the beast to the string', dRide.owned.includes('courser_bay'));
  dm = d.mark();
  await d.press(MOUNT);
  await d.waitFor((m) => m.t === 'ride' && m.mount === 'courser_bay', 'P calls the bought beast', 4000, dm);
  receipt('the whistle answers with no dev hand at all', true);
  // Double-buy refusal, aloud.
  dm = d.mark();
  d.send({ t: 'chat', text: '/give bay_courser 1' });
  await d.waitFor((m) => m.t === 'inv', 'second paper', 4000, dm);
  const dinv2 = d.latest('inv');
  const dslot2 = dinv2!.slots.findIndex((s: any) => s && s.item === 'bay_courser');
  dm = d.mark();
  d.send({ t: 'use', slot: dslot2 });
  await d.waitFor(
    (m) => m.t === 'chat' && /already holds/.test(m.text ?? ''),
    'double-buy refusal',
    4000,
    dm,
  );
  receipt('the stable refuses a double buy, aloud', true);
  // The reconnect: a fresh session must find the beast in the stable.
  d.ws.close();
  await sleep(600);
  const d2 = new Client();
  await d2.open();
  d2.send({ t: 'hello', v: PROTOCOL_VERSION });
  d2.send({ t: 'login', user: `stable_${STAMP}`, pass: 'proving123' });
  await d2.waitFor((m) => m.t === 'welcome', 'relogin welcome', 8000);
  const d2Ride = await d2.waitFor((m) => m.t === 'ride', 'relogin mirror', 6000);
  receipt(
    'THE DB IS THE STABLE: the string survives the logout',
    d2Ride.owned.includes('courser_bay'),
  );
  // The grace window kept the body IN the saddle — the relogin mirror
  // must say so (this is the reconnect bug's receipt), and the
  // whistle must still answer both ways.
  receipt('the rider comes back still in the saddle', d2Ride.mount === 'courser_bay');
  dm = d2.mark();
  await d2.press(MOUNT);
  await d2.waitFor((m) => m.t === 'ride' && m.mount === null, 'relogin step-down', 4000, dm);
  dm = d2.mark();
  await d2.press(MOUNT);
  await d2.waitFor(
    (m) => m.t === 'ride' && m.mount === 'courser_bay',
    'relogin whistle',
    4000,
    dm,
  );
  receipt('the chosen beast still answers after the night', true);
  d2.ws.close();

  // ---- THE WORLD RIDES (THE SADDLE IN THE SCHEDULE): the placed
  // Waykeeper outrider at the Silver Gate carries the mount on
  // appearance and the Ride pose byte, exactly like a player — one
  // wire grammar for every rider. The routine cycles through an
  // authored on-foot watering beat, so the receipt watches until the
  // mounted leg comes around (the loop is ~2 minutes end to end).
  const w = new Client();
  await w.open();
  w.send({ t: 'register', user: `world_${STAMP}`, pass: 'proving123', name: `World ${STAMP}` });
  await w.waitFor((m) => m.t === 'welcome', 'world-rides welcome', 8000);
  w.send({ t: 'chat', text: '/tp -288 -110' });
  await sleep(600);
  const joss = await w.waitFor(
    (m) =>
      (m.t === 'enter' || m.t === 'update') &&
      m.entities?.some((en: Msg) => en.actor === 'outrider_joss'),
    'the outrider in view',
    8000,
  );
  const jossMeta = joss.entities.find((en: Msg) => en.actor === 'outrider_joss');
  w.watchEid = jossMeta.eid;
  const t0 = Date.now();
  let sawRide = false;
  let sawMountMeta = jossMeta.appearance?.mount === 'courser_grey';
  while (Date.now() - t0 < 150_000 && !(sawRide && sawMountMeta)) {
    await sleep(500);
    if (w.watched.some((s) => s.pose === PoseState.Ride)) sawRide = true;
    if (!sawMountMeta) {
      for (const m of w.msgs) {
        if ((m.t === 'enter' || m.t === 'update') && m.entities) {
          for (const en of m.entities) {
            if (en.actor === 'outrider_joss' && en.appearance?.mount === 'courser_grey') {
              sawMountMeta = true;
            }
          }
        }
      }
    }
  }
  receipt('THE WORLD RIDES: the outrider wears the grey on appearance', sawMountMeta);
  receipt('the outrider carries the Ride pose byte on patrol', sawRide);
  w.ws.close();

  console.log(`\nTHE SADDLE LAW HOLDS — ${passed} receipts.`);
  c.ws.close();
  process.exit(0);
};

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
