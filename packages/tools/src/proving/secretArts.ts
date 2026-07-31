/**
 * THE PROVING — live receipts for THE WEAPON TEACHES, driven over the
 * real wire against the running dev server. Registers a throwaway
 * account and walks the whole epic: seat a loan, refuse the double
 * seat, cast both seats, sleep the dormant seat, fill the lesson
 * meter through the real grantXp door, hear the mastery ceremony,
 * cast the mastered art from a foreign hand, and hear both blades of
 * a dual wielder.
 *
 * Usage (against a running dev server):
 *   npm run prove:secret-arts -w @arx/tools
 */
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '@arx/shared';

const URL = 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));
const USER = `proof_${STAMP}`;
const CHAR = `Proof ${STAMP}`;

type Msg = Record<string, any>;
const A1 = 1 << 3; // Ability1 (Q)
const A3 = 1 << 5; // Ability3 (R)

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  seq = 1;
  open(): Promise<void> {
    this.ws = new WebSocket(URL);
    this.ws.on('message', (d: Buffer, isBinary: boolean) => {
      if (isBinary) return;
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
  /** Send one input frame (press-edge needs a follow-up empty frame). */
  frame(buttons: number, aim = 0): void {
    this.send({ t: 'input', frame: { seq: this.seq++, mx: 0, my: 0, aim, buttons } });
  }
  async press(buttons: number): Promise<void> {
    this.frame(buttons);
    await sleep(120);
    this.frame(0);
    await sleep(180);
  }
  /** Wait for a message matching pred, scanning from `from` onward. */
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

async function equipFromPack(c: Client, item: string): Promise<void> {
  const inv = c.latest('inv') ?? (await c.waitFor((m) => m.t === 'inv', 'inv'));
  const idx = inv.slots.findIndex((s: any) => s && s.item === item);
  if (idx < 0) throw new Error(`${item} not in pack`);
  const mark = c.mark();
  c.send({ t: 'use', slot: idx });
  await c.waitFor((m) => m.t === 'equip', `equip after use ${item}`, 4000, mark);
  await sleep(150);
}

async function give(c: Client, item: string): Promise<void> {
  const mark = c.mark();
  c.send({ t: 'chat', text: `/give ${item} 1` });
  await c.waitFor((m) => m.t === 'inv', `inv after /give ${item}`, 4000, mark);
}

const main = async () => {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  c.send({ t: 'register', user: USER, pass: 'proving123', name: CHAR });
  await c.waitFor((m) => m.t === 'welcome', 'welcome (register)');
  await c.waitFor((m) => m.t === 'techniques', 'first techniques push');
  await sleep(300);

  // --- R: seat a loan on Q; the teacher must be in hand.
  await give(c, 'gladius');
  let mark = c.mark();
  c.send({ t: 'technique', ability: 'lunge', slot: 0 });
  // No gladius equipped yet: the seat must refuse and SPEAK.
  const refusal = await c.waitFor(
    (m) => m.t === 'chat' && /answers only to the weapon/.test(m.text ?? ''),
    'loan refusal line',
    4000,
    mark,
  );
  receipt('THE LOAN LAW refuses a teacherless seat, aloud', !!refusal);

  // Level for the gladius' equip gate and heavy_slam's rung — granted
  // BEFORE any secret is seated, so no meter sees a point of it.
  mark = c.mark();
  c.send({ t: 'chat', text: '/xp onehand 500' });
  await c.waitFor((m) => m.t === 'xp' && m.skill === 'onehand', 'onehand levels', 4000, mark);
  await equipFromPack(c, 'gladius');
  mark = c.mark();
  c.send({ t: 'technique', ability: 'lunge', slot: 0 });
  let tq = await c.waitFor((m) => m.t === 'techniques' && m.chosen?.[0] === 'lunge', 'lunge on Q', 4000, mark);
  receipt('the gladius lends Lunge onto Q', tq.chosen[0] === 'lunge');

  // --- R: THE ONE SEAT LAW.
  mark = c.mark();
  c.send({ t: 'technique', ability: 'lunge', slot: 2 });
  await c.waitFor((m) => m.t === 'chat' && /already holds your other seat/.test(m.text ?? ''), 'one-seat refusal', 4000, mark);
  receipt('THE ONE SEAT LAW refuses the double seat, aloud', true);

  // --- R: cast from Q (the loaned art casts).
  mark = c.mark();
  await c.press(A1);
  let cds = await c.waitFor((m) => m.t === 'cooldowns' && m.cd?.[0] > 0, 'Q cast cooldown', 4000, mark);
  receipt('the loaned art casts from Q', cds.cd[0] > 0, `cd ${cds.cd[0]} ticks`);

  // --- R: seat a rung art on R and cast it (both seats live).
  mark = c.mark();
  c.send({ t: 'technique', ability: 'heavy_slam', slot: 2 });
  tq = await c.waitFor((m) => m.t === 'techniques' && m.chosen?.[1] === 'heavy_slam', 'heavy_slam on R', 4000, mark);
  receipt('the rung art seats on R beside the loan', tq.chosen[1] === 'heavy_slam');
  await sleep(1200); // let the Q cast freeze clear
  mark = c.mark();
  await c.press(A3);
  cds = await c.waitFor((m) => m.t === 'cooldowns' && m.cd?.[2] > 0, 'R cast cooldown', 4000, mark);
  receipt('both seats cast — two free hands', cds.cd[2] > 0, `cd ${cds.cd[2]} ticks`);

  // --- R: THE LESSON banks — a paired grant mirrors onto the wire at
  // the coarse step (40 crosses the cost/20 = 35 boundary).
  mark = c.mark();
  c.send({ t: 'chat', text: '/xp onehand 40' });
  const banked = await c.waitFor(
    (m) => m.t === 'techniques' && (m.lessons?.lunge ?? 0) > 0,
    'lesson bank on the wire',
    4000,
    mark,
  );
  receipt('THE LESSON banks mirrored XP on the wire', true, `bank ${banked.lessons.lunge}`);

  // --- R: dormancy — unequip the teacher, Q refuses without spending.
  mark = c.mark();
  c.send({ t: 'unequip', slot: 'weapon' });
  await c.waitFor((m) => m.t === 'equip' && !m.equipment?.weapon, 'weapon unequipped', 4000, mark);
  await sleep(9000); // let both cooldowns fully drain
  mark = c.mark();
  await c.press(A1);
  await sleep(600);
  const dormantCast = c.msgs.slice(mark).some((m) => m.t === 'cooldowns' && m.cd?.[0] > 0);
  receipt('THE LOAN LAW sleeps the orphaned seat (no cast, nothing spent)', !dormantCast);

  // --- R: the teacher returns, the seat wakes.
  await equipFromPack(c, 'gladius');
  mark = c.mark();
  await c.press(A1);
  cds = await c.waitFor((m) => m.t === 'cooldowns' && m.cd?.[0] > 0, 'Q casts again', 4000, mark);
  receipt('the returning blade wakes the seat', cds.cd[0] > 0);

  // --- R: THE LESSON completes through the real grantXp door.
  mark = c.mark();
  c.send({ t: 'chat', text: '/xp onehand 800' });
  const ceremony = await c.waitFor(
    (m) => m.t === 'chat' && /yours now: Lunge/.test(m.text ?? ''),
    'mastery ceremony',
    5000,
    mark,
  );
  receipt('the mastery ceremony speaks', !!ceremony, ceremony.text);
  tq = await c.waitFor((m) => m.t === 'techniques' && m.earned?.includes('lunge'), 'earned carries lunge', 4000, mark);
  receipt('the mastered secret rides the earned wire', true);

  // --- R: cross-weapon — a bow in hand, the sword's art still casts.
  await give(c, 'stickbow');
  await equipFromPack(c, 'stickbow');
  await sleep(300);
  const afterSwap = c.latest('techniques');
  receipt('THE LOAN FOLLOWS THE BLADE leaves a mastered Q alone',
    (afterSwap?.chosen?.[0] ?? c.latest('techniques')) && (c.latest('techniques')!.chosen[0] === 'lunge'));
  await sleep(9000);
  mark = c.mark();
  await c.press(A1);
  cds = await c.waitFor((m) => m.t === 'cooldowns' && m.cd?.[0] > 0, 'cross-weapon cast', 4000, mark);
  receipt('the mastered art casts bow-in-hand — no blade may take it back', cds.cd[0] > 0);

  // --- R: the dual wielder hears both blades.
  mark = c.mark();
  c.send({ t: 'chat', text: '/xp onehand 2000' }); // clear melee 10 for the twin discovery
  await c.waitFor((m) => m.t === 'xp' && m.skill === 'onehand', 'onehand xp 2', 4000, mark);
  await give(c, 'bronze_sword');
  await equipFromPack(c, 'bronze_sword');
  await give(c, 'bronze_dagger');
  await equipFromPack(c, 'bronze_dagger'); // routes to the offhand — dual wield
  const eq = c.latest('equip');
  receipt('the second blade routes to the offhand', !!eq?.equipment?.offhand, eq?.equipment?.offhand?.id);
  mark = c.mark();
  c.send({ t: 'technique', ability: 'shadowstep', slot: 2 });
  tq = await c.waitFor((m) => m.t === 'techniques' && m.chosen?.[1] === 'shadowstep', 'offhand art seats', 4000, mark);
  receipt('the OFFHAND lends its art onto R — the dual wielder hears both blades', true);
  await sleep(9000);
  mark = c.mark();
  await c.press(A3);
  cds = await c.waitFor((m) => m.t === 'cooldowns' && m.cd?.[2] > 0, 'offhand art casts', 4000, mark);
  receipt('the offhand loan casts', cds.cd[2] > 0);

  // --- R: THE HAND REMEMBERS — relog with a weapon in hand seeds Q.
  // Clear Q's occupant first? Q holds mastered lunge (the player's
  // arrangement) — seeding must NOT touch it. Assert exactly that.
  c.ws.close();
  await sleep(1500);
  const c2 = new Client();
  await c2.open();
  c2.send({ t: 'hello', v: PROTOCOL_VERSION });
  c2.send({ t: 'login', user: USER, pass: 'proving123' });
  await c2.waitFor((m) => m.t === 'welcome', 'welcome (relog)');
  const tq2 = await c2.waitFor((m) => m.t === 'techniques', 'techniques on relog');
  receipt('THE HAND REMEMBERS across the relog, and never overwrites a chosen seat',
    tq2.chosen[0] === 'lunge' && tq2.chosen[1] === 'shadowstep',
    `chosen [${tq2.chosen.join(', ')}] earned [${(tq2.earned ?? []).join(', ')}]`);
  c2.ws.close();

  console.log(`\nTHE PROVING: ${passed} receipts, all honest.`);
  process.exit(0);
};

main().catch((err) => {
  console.error('\nPROVING FAILED:', err.message);
  process.exit(1);
});
