/**
 * THE PROVING — live receipts for THE OPEN HAND (docs/beastcraft-plan.md
 * Phase 1), driven over the real wire against the running dev server.
 * Registers a throwaway keeper and walks the whole law: the join
 * mirror, every spoken refusal (rung, whole heart, empty pack), the
 * broken kneel that costs nothing, the true gentling with its
 * ceremony, the collar tag, the heel across real ground, trailing and
 * the calm re-emergence (underground, where the saddle refuses and
 * the companion follows), the untouchable-body law, THREE STALLS, and
 * a full logout: the DB is the animal.
 *
 * Usage (against a running dev server):
 *   npm run prove:pets -w @arx/tools
 */
import WebSocket from 'ws';
import {
  ByteReader,
  BinaryMsgType,
  decodeSnapshot,
  PROTOCOL_VERSION,
  GENTLE_HP_FRAC,
} from '@arx/shared';

const URL = 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));
const USER = `keeper_${STAMP}`;
const CHAR = `Keeper ${STAMP}`;

type Msg = Record<string, any>;
const ATTACK = 1 << 0;

type Sample = { x: number; y: number; pose: number; hpPct: number; at: number };

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  seq = 1;
  eid = -1;
  pos: Sample | null = null;
  /** Latest snapshot sample per visible entity — the watcher's truth. */
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
          const s: Sample = { x: e.x, y: e.y, pose: e.pose, hpPct: e.hpPct, at: Date.now() };
          this.ents.set(e.eid, s);
          if (e.eid === this.eid) this.pos = s;
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
  async waitFor(pred: (m: Msg) => boolean, label: string, timeoutMs = 5000, from = 0): Promise<Msg> {
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
  /** Every entity eid whose latest enter/update meta carried this ownerEid. */
  petEids(ownerEid: number): number[] {
    const out = new Set<number>();
    for (const m of this.msgs) {
      if (m.t !== 'enter' && m.t !== 'update') continue;
      for (const en of m.entities ?? []) {
        if (en.ownerEid === ownerEid && en.defId && en.level !== undefined) out.add(en.eid);
      }
    }
    return [...out];
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
  await say(c, `/tp ${x} ${y}`);
}

/** The gentling window on the wire: hpPct is a u8, 255 = whole. */
const WINDOW_PCT = Math.floor(255 * GENTLE_HP_FRAC);

const main = async () => {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  c.send({ t: 'register', user: USER, pass: 'proving123', name: CHAR });
  const welcome = await c.waitFor((m) => m.t === 'welcome', 'welcome (register)');
  c.eid = welcome.eid;

  // --- The join mirror: an empty household, said out loud.
  const first = await c.waitFor((m) => m.t === 'pet', 'join pet mirror');
  receipt(
    'THE WIRE STAYS LEAN: the household mirror arrives on join, empty',
    Array.isArray(first.pets) && first.pets.length === 0,
  );

  // --- Stage: open ground, a thick neck (the beetle bites back), a blade.
  const jit = Number(STAMP) % 11;
  const course: [number, number] = [200 + jit, 60 + jit];
  await tp(c, course[0], course[1]);
  await say(c, '/xp vitality 200000');
  await say(c, '/xp defence 200000');
  let mark = c.mark();
  await say(c, '/give bronze_sword 1');
  const inv0 = await c.waitFor((m) => m.t === 'inv', 'sword in pack', 5000, mark);
  const swordSlot = inv0.slots.findIndex((s: any) => s && s.item === 'bronze_sword');
  c.send({ t: 'use', slot: swordSlot });
  await sleep(500);

  // --- A beetle to court.
  mark = c.mark();
  await say(c, '/spawnmob giant_beetle 1');
  await c.waitFor(
    (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.defId === 'giant_beetle'),
    'beetle enters',
    6000,
    mark,
  );
  const beetleMeta = c.msgs
    .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
    .find((e: Msg) => e.defId === 'giant_beetle');
  const beetle: number = beetleMeta.eid;
  await sleep(400);

  // --- Refusal 1: the rung. Beastcraft 1 asks and is told, aloud.
  mark = c.mark();
  c.send({ t: 'interactnpc', eid: beetle });
  await c.waitFor(
    (m) => m.t === 'chat' && /need beastcraft level 10/.test(m.text ?? ''),
    'rung refusal',
    5000,
    mark,
  );
  receipt('the rung refuses, aloud, and teaches the number', true);

  // --- Refusal 2: a whole heart. Level up, ask again untouched.
  await say(c, '/xp beastcraft 1200');
  mark = c.mark();
  c.send({ t: 'interactnpc', eid: beetle });
  await c.waitFor(
    (m) => m.t === 'chat' && /too much fight left/.test(m.text ?? ''),
    'whole-heart refusal',
    5000,
    mark,
  );
  receipt('a whole heart refuses the hand', true);

  // --- Wear it down into the craven window (whiff-0 makes this a
  // real fight: some swings write nothing, and that is the law).
  const swingUntilWorn = async (): Promise<void> => {
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 60000) throw new Error('could not wear the beetle down in 60s');
      const b = c.ents.get(beetle);
      const me = c.pos;
      if (b && b.hpPct > 0 && b.hpPct <= WINDOW_PCT) return;
      if (!b || b.hpPct === 0) throw new Error('the beetle died — the wound overshot the window');
      if (b && me) {
        const d = Math.hypot(b.x - me.x, b.y - me.y);
        const aim = Math.atan2(b.y - me.y, b.x - me.x);
        if (d > 1.4) {
          c.frame(0, Math.cos(aim), Math.sin(aim), aim);
        } else {
          c.frame(ATTACK, 0, 0, aim);
          await sleep(80);
          c.frame(0, 0, 0, aim);
          await sleep(520);
          continue;
        }
      }
      await sleep(100);
    }
  };
  await swingUntilWorn();
  const worn = c.ents.get(beetle)!;
  receipt(
    'the wound opens the door: the beetle stands in the craven window',
    worn.hpPct > 0 && worn.hpPct <= WINDOW_PCT,
    `hpPct ${worn.hpPct}/${WINDOW_PCT}`,
  );

  // --- Refusal 3: the empty pack (worn down, right rung, no lure).
  mark = c.mark();
  c.send({ t: 'interactnpc', eid: beetle });
  await c.waitFor(
    (m) => m.t === 'chat' && /noses your pack for berries/.test(m.text ?? ''),
    'lure refusal',
    5000,
    mark,
  );
  receipt('the empty pack refuses, and names the lure', true);

  // --- The broken kneel: start the gentling, walk away. The lure
  // must still be whole — an interrupt costs nothing.
  mark = c.mark();
  await say(c, '/give berries 5');
  c.send({ t: 'interactnpc', eid: beetle });
  await c.waitFor((m) => m.t === 'action' && m.state === 'start', 'kneel starts', 5000, mark);
  const walkT0 = Date.now();
  while (Date.now() - walkT0 < 1400) {
    c.frame(0, -1, 0);
    await sleep(50);
  }
  c.frame(0);
  await c.waitFor((m) => m.t === 'action' && m.state === 'stop', 'kneel breaks', 5000, mark);
  receipt('walking off breaks the kneel', true);

  // --- The true gentling: kneel it out, unbroken.
  const b0 = c.ents.get(beetle)!;
  const me0 = c.pos!;
  const back = Math.atan2(b0.y - me0.y, b0.x - me0.x);
  const rt0 = Date.now();
  while (Date.now() - rt0 < 1600) {
    const b = c.ents.get(beetle)!;
    const me = c.pos!;
    if (Math.hypot(b.x - me.x, b.y - me.y) < 1.4) break;
    c.frame(0, Math.cos(back), Math.sin(back), back);
    await sleep(50);
  }
  c.frame(0);
  await sleep(200);
  mark = c.mark();
  c.send({ t: 'interactnpc', eid: beetle });
  await c.waitFor((m) => m.t === 'action' && m.state === 'start', 'kneel starts again', 5000, mark);
  const ceremony = await c.waitFor((m) => m.t === 'pet' && m.ceremony !== undefined, 'the ceremony', 9000, mark);
  const tamed = ceremony.pets.find((p: Msg) => p.slot === ceremony.ceremony);
  receipt(
    'THE GENTLING IS EARNED: the beetle is yours, at heel, level true',
    tamed?.species === 'giant_beetle' && tamed?.state === 'heel' && tamed?.level === 6,
    `slot ${ceremony.ceremony}, level ${tamed?.level}`,
  );
  await c.waitFor((m) => m.t === 'chat' && /It is yours now/.test(m.text ?? ''), 'ceremony line', 5000, mark);
  const invAfter = await c.waitFor((m) => m.t === 'inv', 'lure consumed', 5000, mark);
  const berriesLeft = invAfter.slots.find((s: any) => s && s.item === 'berries')?.qty ?? 0;
  receipt('one lure spent at the finish, none on the broken kneel', berriesLeft === 4, `berries ${berriesLeft}`);

  // --- The wild body left the world's books; the companion stands.
  await sleep(600);
  const petEids = c.petEids(c.eid);
  receipt('the companion is a true second entity on the ordinary lanes', petEids.length >= 1);
  const petEid = petEids[petEids.length - 1]!;

  // --- The collar tag: name it, live; junk will not stick.
  mark = c.mark();
  c.send({ t: 'petname', slot: ceremony.ceremony, name: '  Bramble ' });
  const named = await c.waitFor(
    (m) => m.t === 'pet' && m.pets?.some((p: Msg) => p.name === 'Bramble'),
    'the name lands',
    5000,
    mark,
  );
  receipt('the collar tag lands, sanitized', named.pets.some((p: Msg) => p.name === 'Bramble'));
  mark = c.mark();
  c.send({ t: 'petname', slot: ceremony.ceremony, name: 'x!' });
  await c.waitFor((m) => m.t === 'chat' && /will not stick/.test(m.text ?? ''), 'junk name refusal', 5000, mark);
  receipt('a junk name will not stick, aloud', true);

  // --- THE HEEL: run a real course; the companion keeps up.
  const runT0 = Date.now();
  while (Date.now() - runT0 < 2000) {
    c.frame(0, 1, 0);
    await sleep(50);
  }
  c.frame(0);
  await sleep(1200);
  const pb = c.ents.get(petEid);
  const pm = c.pos;
  const heelDist = pb && pm ? Math.hypot(pb.x - pm.x, pb.y - pm.y) : 999;
  receipt('the heel holds across real ground', heelDist < 6, `${heelDist.toFixed(1)} tiles behind`);

  // --- THE HEEL FORGIVES THE ROAD, and the underground WELCOMES the
  // companion (the exact ground where the saddle refuses): jump far,
  // stand calm, watch it re-emerge beside you in the dark band.
  await tp(c, -330, 552);
  await sleep(300);
  if ((c.pos?.y ?? 0) < 512) throw new Error('tp to the Undercroft landing missed');
  const reT0 = Date.now();
  let reunited: number | null = null;
  while (Date.now() - reT0 < 6000) {
    c.frame(0); // stand calm — the counter needs a quiet stride
    for (const eid2 of c.petEids(c.eid)) {
      const s = c.ents.get(eid2);
      if (s && c.pos && Math.hypot(s.x - c.pos.x, s.y - c.pos.y) < 5 && s.at > reT0) {
        reunited = eid2;
        break;
      }
    }
    if (reunited !== null) break;
    await sleep(150);
  }
  receipt('trailing forgives the road; the underground welcomes the friend', reunited !== null);

  // --- The untouchable body: your own blade cannot find it.
  const target = c.ents.get(reunited!)!;
  const aimPet = Math.atan2(target.y - c.pos!.y, target.x - c.pos!.x);
  for (let i = 0; i < 4; i++) {
    c.frame(ATTACK, 0, 0, aimPet);
    await sleep(80);
    c.frame(0, 0, 0, aimPet);
    await sleep(420);
  }
  await sleep(400);
  const after = c.ents.get(reunited!);
  receipt('no blade touches a companion', (after?.hpPct ?? 0) === 255, `hpPct ${after?.hpPct}`);

  // --- THREE STALLS: fill the household, then hear the refusal.
  mark = c.mark();
  await say(c, '/tame rat');
  await c.waitFor((m) => m.t === 'pet' && m.pets?.length === 2, 'second stall', 5000, mark);
  mark = c.mark();
  await say(c, '/tame rat');
  await c.waitFor((m) => m.t === 'pet' && m.pets?.length === 3, 'third stall', 5000, mark);
  mark = c.mark();
  await say(c, '/tame rat');
  await c.waitFor(
    (m) => m.t === 'chat' && /Your stalls are full/.test(m.text ?? ''),
    'cap refusal',
    5000,
    mark,
  );
  receipt('THREE STALLS, ONE HEEL: the fourth ask is refused, aloud', true);

  // --- THE DB IS THE ANIMAL: a full logout keeps the household whole,
  // the names kept, the heel row standing back up beside the keeper.
  c.ws.close();
  await sleep(600);
  const c2 = new Client();
  await c2.open();
  c2.send({ t: 'hello', v: PROTOCOL_VERSION });
  c2.send({ t: 'login', user: USER, pass: 'proving123' });
  const w2 = await c2.waitFor((m) => m.t === 'welcome', 'relogin welcome', 9000);
  c2.eid = w2.eid;
  const mirror2 = await c2.waitFor((m) => m.t === 'pet' && (m.pets?.length ?? 0) > 0, 'relogin mirror', 7000);
  const bramble = mirror2.pets.find((p: Msg) => p.name === 'Bramble');
  const heel2 = mirror2.pets.find((p: Msg) => p.state === 'heel' || p.state === 'trailing');
  receipt(
    'the household survives the night: three stalls, the name kept',
    mirror2.pets.length === 3 && bramble?.species === 'giant_beetle' && heel2?.species === 'rat',
  );
  const spawnT0 = Date.now();
  let backAtHeel = false;
  while (Date.now() - spawnT0 < 7000) {
    c2.frame(0);
    for (const eid2 of c2.petEids(c2.eid)) {
      const s = c2.ents.get(eid2);
      if (s && c2.pos && Math.hypot(s.x - c2.pos.x, s.y - c2.pos.y) < 6) backAtHeel = true;
    }
    if (backAtHeel) break;
    await sleep(150);
  }
  receipt('the heel companion stands back up with its keeper', backAtHeel);

  console.log(`\nTHE OPEN HAND HOLDS — ${passed} receipts.`);
  c2.ws.close();
  process.exit(0);
};

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
