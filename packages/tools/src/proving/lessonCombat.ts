/**
 * LESSON-BY-COMBAT PROOF — does real fighting (not /xp) feed the
 * secret-art mastery bank, and does the bank reach the client's wire?
 *
 * Repro of the user's report: gladius in hand, lunge seated on Q,
 * skeletons spawned and fought with basic attacks only. Every /xp
 * dev grant happens BEFORE the art is seated, so any lessons.lunge
 * on the wire afterward was earned by steel alone.
 */
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '@arx/shared';

const URL = 'ws://localhost:8790/ws';
const STAMP = String(Math.floor(Math.random() * 1e6));
const USER = `lessonproof_${STAMP}`;

type Msg = Record<string, any>;
const ATTACK = 1 << 0;

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
  frame(buttons: number, aim = 0): void {
    this.send({ t: 'input', frame: { seq: this.seq++, mx: 0, my: 0, aim, buttons } });
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
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
function receipt(name: string, ok: boolean, detail = ''): void {
  if (!ok) throw new Error(`RECEIPT FAILED: ${name} ${detail}`);
  passed++;
  console.log(`RECEIPT ${passed}  ${name}${detail ? `  (${detail})` : ''}`);
}

const main = async () => {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  c.send({ t: 'register', user: USER, pass: 'proving123', name: `Lesson ${STAMP}` });
  await c.waitFor((m) => m.t === 'welcome', 'welcome');
  await c.waitFor((m) => m.t === 'techniques', 'first techniques push');
  await sleep(300);

  // --- Setup, all dev grants BEFORE the art is seated.
  c.send({ t: 'chat', text: '/xp onehand 500' });
  c.send({ t: 'chat', text: '/xp vitality 8000' });
  let mark = c.mark();
  c.send({ t: 'chat', text: '/give gladius 1' });
  await c.waitFor((m) => m.t === 'inv', 'inv after give', 5000, mark);
  const inv = c.latest('inv')!;
  const idx = inv.slots.findIndex((s: any) => s && s.item === 'gladius');
  mark = c.mark();
  c.send({ t: 'use', slot: idx });
  await c.waitFor((m) => m.t === 'equip' && m.equipment?.weapon, 'gladius equipped', 5000, mark);
  await sleep(200);

  mark = c.mark();
  c.send({ t: 'technique', ability: 'lunge', slot: 0 });
  const tq = await c.waitFor((m) => m.t === 'techniques' && m.chosen?.[0] === 'lunge', 'lunge seated', 5000, mark);
  const baseline = tq.lessons?.lunge ?? 0;
  console.log(`setup: lunge on Q, lesson baseline ${baseline}`);

  // --- The fight: real skeletons, basic attacks only, aim rotating.
  const fightMark = c.mark();
  c.send({ t: 'chat', text: '/spawnmob skeleton 6' });
  await c.waitFor((m) => m.t === 'chat' && /Spawned/.test(m.text ?? ''), 'spawn confirm', 5000, fightMark);

  let strikeXp = 0;
  let scanned = fightMark;
  const deadline = Date.now() + 45_000;
  let dir = 0;
  while (Date.now() < deadline) {
    c.frame(ATTACK, (dir++ % 8) * (Math.PI / 4));
    await sleep(90);
    c.frame(0, 0);
    await sleep(90);
    for (; scanned < c.msgs.length; scanned++) {
      const m = c.msgs[scanned]!;
      if (m.t === 'xp' && m.skill === 'onehand') strikeXp += m.gained ?? 0;
    }
    if (strikeXp >= 60) break; // comfortably past several whole-percent steps
  }
  receipt('real strikes pay onehand XP through the one door', strikeXp > 0, `${strikeXp} xp from steel`);

  // --- The bank must reach the wire without any /xp after seating.
  const banked = await c.waitFor(
    (m) => m.t === 'techniques' && (m.lessons?.lunge ?? 0) > baseline,
    'lessons.lunge on the wire after combat',
    8000,
    fightMark,
  );
  receipt('THE LESSON banks combat XP onto the wire', true, `bank ${banked.lessons.lunge} (baseline ${baseline})`);
  const finalBank = c.latest('techniques')!.lessons?.lunge ?? banked.lessons.lunge;

  // --- Persistence: relog and the bank is still there.
  c.ws.close();
  await sleep(1500);
  const c2 = new Client();
  await c2.open();
  c2.send({ t: 'hello', v: PROTOCOL_VERSION });
  c2.send({ t: 'login', user: USER, pass: 'proving123' });
  await c2.waitFor((m) => m.t === 'welcome', 'welcome (relog)');
  const tq2 = await c2.waitFor((m) => m.t === 'techniques', 'techniques on relog');
  receipt(
    'the bank survives the relog (flushed flag, reloaded wire)',
    (tq2.lessons?.lunge ?? 0) >= Math.min(finalBank, 35),
    `relog bank ${tq2.lessons?.lunge ?? 0}`,
  );
  c2.ws.close();

  console.log(`\nLESSON-BY-COMBAT: ${passed} receipts, all honest.`);
  process.exit(0);
};

main().catch((err) => {
  console.error('\nPROOF FAILED:', err.message);
  process.exit(1);
});
