/**
 * COMBAT V2 PROOF — THE PROVING (docs/combat-v2-plan.md Phase 6).
 * Every law the six phases shipped, receipted over the REAL wire
 * against a running server: the spoken beat, the one rhythm's resets,
 * the held intent, the dodge-weave, the honest swing's windup, the
 * branch, the pages (roster live), the guard sweep, the knife's
 * hunger, the weave, the overcharge volley, and the cadence contract.
 *
 * Run: PORT=8796 DB_DATABASE=arx_prove_c2 npm run dev -w @arx/server
 * then ARX_PROVE_URL=ws://localhost:8796/ws npm run prove:combat-v2 -w @arx/tools
 */
import WebSocket from 'ws';
import {
  BinaryMsgType,
  ByteReader,
  COMBO_GRACE_TICKS,
  DRAW_FULL_TICKS,
  OVERCHARGE_TICKS,
  PROTOCOL_VERSION,
  PoseState,
  decodeSnapshot,
} from '@arx/shared';

const URL = process.env.ARX_PROVE_URL ?? 'ws://localhost:8790/ws';
const STAMP = String(Math.floor(Math.random() * 1e6));
const USER = `combatv2_${STAMP}`;
const ATTACK = 1 << 0;
const DODGE = 1 << 2;
const SHEATHE = 1 << 9;
const TICK = 50;

type Msg = Record<string, any>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
function receipt(name: string, ok: boolean, detail = ''): void {
  if (!ok) throw new Error(`RECEIPT FAILED: ${name} ${detail}`);
  passed++;
  console.log(`RECEIPT ${passed}  ${name}${detail ? `  (${detail})` : ''}`);
}

class Client {
  ws!: WebSocket;
  msgs: Msg[] = [];
  seq = 1;
  ownEid = -1;
  /** Latest snapshot sample per entity. */
  snap = new Map<number, { x: number; y: number; pose: number; hpPct: number; at: number }>();
  /** Own pose byte history (guard-sweep reads). */
  ownPoses: Array<{ pose: number; at: number }> = [];
  defIds = new Map<number, string>();
  lastCmdAt = 0;

  open(): Promise<void> {
    this.ws = new WebSocket(URL);
    this.ws.on('message', (d: Buffer, isBinary: boolean) => {
      if (isBinary) {
        const r = new ByteReader(new Uint8Array(d).buffer);
        if (r.u8() !== BinaryMsgType.Snapshot) return;
        const snap = decodeSnapshot(r);
        const at = Date.now();
        for (const e of snap.entities) {
          this.snap.set(e.eid, { x: e.x, y: e.y, pose: e.pose, hpPct: e.hpPct, at });
          if (e.eid === this.ownEid) {
            const last = this.ownPoses[this.ownPoses.length - 1];
            if (!last || last.pose !== e.pose) this.ownPoses.push({ pose: e.pose, at });
          }
        }
        return;
      }
      const m = JSON.parse(d.toString());
      m.at = Date.now();
      this.msgs.push(m);
      if (m.t === 'welcome') this.ownEid = m.eid;
      if (m.t === 'enter' || m.t === 'update') {
        for (const en of m.entities ?? []) if (en.defId) this.defIds.set(en.eid, en.defId);
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
  /** Dev chat, paced under the 1/s bucket. */
  async cmd(text: string): Promise<void> {
    const wait = this.lastCmdAt + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastCmdAt = Date.now();
    this.send({ t: 'chat', text });
  }
  frame(buttons: number, aim = 0, mx = 0, my = 0): void {
    this.send({ t: 'input', frame: { seq: this.seq++, mx, my, aim, buttons } });
  }
  mark(): number {
    return this.msgs.length;
  }
  since(from: number, t: string): Msg[] {
    return this.msgs.slice(from).filter((m) => m.t === t);
  }
  async waitFor(pred: (m: Msg) => boolean, label: string, timeoutMs = 6000, from = 0): Promise<Msg> {
    const t0 = Date.now();
    let i = from;
    for (;;) {
      for (; i < this.msgs.length; i++) if (pred(this.msgs[i]!)) return this.msgs[i]!;
      if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${label}`);
      await sleep(50);
    }
  }
  async give(id: string): Promise<void> {
    const mark = this.mark();
    await this.cmd(`/give ${id} 1`);
    await this.waitFor((m) => m.t === 'inv', `inv after give ${id}`, 6000, mark);
  }
  async equip(id: string): Promise<void> {
    const inv = [...this.msgs].reverse().find((m) => m.t === 'inv')!;
    const idx = inv.slots.findIndex((s: any) => s && s.item === id);
    if (idx < 0) {
      const held = inv.slots.filter(Boolean).map((x: any) => `${x.item}x${x.qty}`);
      throw new Error(`${id} not in inventory: [${held.join(', ')}]`);
    }
    const mark = this.mark();
    this.send({ t: 'use', slot: idx });
    await this.waitFor((m) => m.t === 'equip', `equip after use ${id}`, 6000, mark);
    await sleep(150);
  }
  ownPos(): { x: number; y: number } {
    const s = this.snap.get(this.ownEid);
    return s ? { x: s.x, y: s.y } : { x: 0, y: 0 };
  }
}

/** Hold the attack bit for `swings` combo messages; returns them. */
async function holdFor(c: Client, swings: number, aim = 0, timeoutMs = 12_000): Promise<Msg[]> {
  const from = c.mark();
  const t0 = Date.now();
  while (c.since(from, 'combo').length < swings) {
    if (Date.now() - t0 > timeoutMs) {
      throw new Error(`hold-flow stalled: ${c.since(from, 'combo').length}/${swings} swings`);
    }
    c.frame(ATTACK, aim);
    await sleep(45);
  }
  c.frame(0, aim);
  await sleep(120);
  return c.since(from, 'combo').slice(0, swings);
}

/** Let every recovery + grace die so the next swing opens fresh. */
async function restStringDead(c: Client): Promise<void> {
  for (let i = 0; i < 8; i++) {
    c.frame(0, 0);
    await sleep(200);
  }
}

const main = async () => {
  const c = new Client();
  await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION });
  c.send({ t: 'register', user: USER, pass: 'proving123', name: `Cadence ${STAMP}` });
  await c.waitFor((m) => m.t === 'welcome', 'welcome');
  await sleep(500);

  // ---------------------------------------------------------- A. strings
  await c.give('bronze_sword');
  await c.equip('bronze_sword');

  // ------------------------------------------------ B. death, then armor
  let from = c.mark();
  await c.cmd('/spawnmob skeleton 8');
  await sleep(800);
  // A player death has no dedicated message — the receipts are the
  // spill's deathmark and the wake-up jump. We provoke the pack (the
  // hearth keeps spawned bones polite until struck) and let 10hp meet
  // eight skeletons.
  const p0 = c.ownPos();
  let died = false;
  const dieDeadline = Date.now() + 60_000;
  let dir = 0;
  while (!died && Date.now() < dieDeadline) {
    c.frame(ATTACK, (dir++ % 8) * (Math.PI / 4));
    await sleep(60);
    c.frame(0, 0);
    await sleep(60);
    if (c.since(from, 'deathmark').some((m) => m.mark)) died = true;
    const p = c.ownPos();
    if ((p.x - p0.x) ** 2 + (p.y - p0.y) ** 2 > 225) died = true;
  }
  receipt('the fall came (10hp meets eight provoked skeletons)', died);
  await sleep(1200); // respawn settles far from the pack
  await c.give('bronze_sword'); // the spill took the steel
  await c.equip('bronze_sword');
  let beats = await holdFor(c, 1);
  receipt('no string survives the fall', beats[0]!.stage === 0);

  await c.cmd('/xp vitality 2000000'); // the proving armor: receipts, not a second fall
  await c.cmd('/xp onehand 5000'); // dualwield unlocks at onehand 10
  await c.cmd('/xp arx 2000');
  await c.cmd('/xp archery 2000');
  await c.cmd('/xp twohand 2000');
  await sleep(400);


  // Clean ground for every receipt after the fall: the hearth keeps
  // its bone pack (and every prior run's) — the proving moves out.
  {
    const home = c.ownPos();
    await c.cmd(`/tp ${Math.round(home.x + 120)} ${Math.round(home.y + 80)}`);
    await sleep(900);
  }


  beats = await holdFor(c, 4);
  receipt(
    'THE SPOKEN BEAT: the sword string speaks all four stages in order',
    beats.map((m) => m.stage).join() === '0,1,2,3' && beats.every((m) => m.len === 4),
    `stages ${beats.map((m) => m.stage).join('/')}`,
  );
  receipt(
    'THE RUN rides every beat',
    beats.map((m) => m.run).join() === '1,2,3,4',
    `runs ${beats.map((m) => m.run).join('/')}`,
  );
  receipt(
    'the spoken grace is the honest window',
    beats.every((m) => m.grace > 0 && m.grace <= 28 + COMBO_GRACE_TICKS),
    `graces ${beats.map((m) => m.grace).join('/')}`,
  );

  await restStringDead(c);
  beats = await holdFor(c, 1);
  receipt('a rest past grace starts the string over', beats[0]!.stage === 0);

  // The run survives the wrap while rhythm holds.
  await restStringDead(c);
  beats = await holdFor(c, 6);
  receipt(
    'THE RUN flows through the wrap',
    beats.map((m) => m.run).join() === '1,2,3,4,5,6',
    `runs ${beats.map((m) => m.run).join('/')}`,
  );

  // THE PAGE ROSTER, live on the wire: pages announce their length.
  // (The greatblade first: onehand 10+ makes a second one-hander take
  // the OFF hand, so the knife must arrive from a two-handed main.)
  await c.give('iron_greatblade');
  await c.equip('iron_greatblade');
  await restStringDead(c);
  beats = await holdFor(c, 3);
  receipt('the mountain line is three beats', beats.every((m) => m.len === 3));

  await c.give('shiv');
  await c.equip('shiv'); // twohand -> knife swaps the main hand clean
  await restStringDead(c);
  beats = await holdFor(c, 5);
  receipt(
    'the knife weave is five beats',
    beats.map((m) => m.stage).join() === '0,1,2,3,4' && beats.every((m) => m.len === 5),
  );

  await c.give('carved_staff');
  await c.equip('carved_staff');
  await restStringDead(c);
  beats = await holdFor(c, 3);
  receipt('the bolt rhythm is three beats', beats.every((m) => m.len === 3));

  await c.cmd('/xp arx 60000'); // the battlestaff gates on the school
  await sleep(300);
  await c.give('ember_battlestaff');
  await c.equip('ember_battlestaff');
  await restStringDead(c);
  beats = await holdFor(c, 4);
  receipt(
    'THE PAGE ROSTER lives: the battlestaff weaves four beats',
    beats.every((m) => m.len === 4),
  );

  // THE STRING BELONGS TO THE WEAPON: swap mid-grace, the string dies.
  await c.equip('bronze_sword');
  await restStringDead(c);
  beats = await holdFor(c, 2);
  receipt('two sword beats down', beats[1]!.stage === 1);
  await c.equip('iron_greatblade'); // inside the grace window
  beats = await holdFor(c, 1);
  receipt('a swapped-in weapon never inherits the string', beats[0]!.stage === 0);

  // The sheathed string is a dropped string.
  await c.equip('bronze_sword');
  await restStringDead(c);
  await holdFor(c, 2);
  c.frame(SHEATHE, 0); // stow mid-grace
  await sleep(150);
  c.frame(0, 0);
  await sleep(150);
  c.frame(ATTACK, 0); // THE SAFETY: this press draws, drawLock holds the swing
  await sleep(120);
  c.frame(0, 0);
  await sleep(700); // the draw-lock passes
  beats = await holdFor(c, 1);
  receipt('the stowed string is a dropped string', beats[0]!.stage === 0);

  // THE HELD INTENT: one tap in the recovery tail fires at ready.
  await restStringDead(c);
  from = c.mark();
  c.frame(ATTACK, 0);
  await sleep(60);
  c.frame(0, 0); // one swing (recovery 7 ticks = 350ms)
  await c.waitFor((m) => m.t === 'combo', 'first swing', 4000, from);
  await sleep(180); // ~3-4 ticks into recovery: the buffer window
  c.frame(ATTACK, 0); // the tap: press edge...
  await sleep(50);
  from = c.mark();
  c.frame(0, 0); // ...released well before ready
  // The shipped client streams frames continuously; the buffer spends
  // itself on the frame processed at ready — so the lane idles LOUDLY.
  let buffered: Msg | null = null;
  const bufferDeadline = Date.now() + 1500;
  while (buffered === null && Date.now() < bufferDeadline) {
    c.frame(0, 0);
    await sleep(45);
    buffered = c.since(from, 'combo')[0] ?? null;
  }
  receipt(
    'THE HELD INTENT: a tap in the tail fires at ready, unheld',
    buffered !== null && buffered.stage === 1,
    buffered ? `stage ${buffered.stage}` : 'no swing fired',
  );

  // THE DODGE-WEAVE: the finisher's long rest is cut by a fired dodge.
  await restStringDead(c);
  beats = await holdFor(c, 4); // through the finisher (recovery 14t = 700ms)
  const finisherAt = beats[3]!.at;
  c.frame(DODGE, 0, 1, 0); // dodge needs movement intent
  await sleep(60);
  from = c.mark();
  let woven: Msg | null = null;
  const weaveDeadline = Date.now() + 2000;
  while (woven === null && Date.now() < weaveDeadline) {
    c.frame(ATTACK, 0);
    await sleep(45);
    woven = c.since(from, 'combo')[0] ?? null;
  }
  c.frame(0, 0);
  if (!woven) throw new Error('post-dodge swing never fired');
  receipt(
    'THE DODGE-WEAVE cuts the recovery, the string stays alive',
    woven.at - finisherAt < 480,
    `${woven.at - finisherAt}ms after the finisher (uncut would be ~700ms)`,
  );

  // ------------------------------------- C. the honest swing, with teeth
  from = c.mark();
  await c.cmd('/spawnmob skeleton 4');
  await c.waitFor((m) => m.t === 'chat' && /Spawned/.test(m.text ?? ''), 'spawn', 6000, from);
  await sleep(1500); // let them close to melee

  // Windup honesty: press -> impact ≈ 2 ticks on sword chips.
  const gaps: number[] = [];
  for (let tries = 0; tries < 14 && gaps.length < 5; tries++) {
    await restStringDead(c);
    const m0 = c.mark();
    // Aim at the nearest skeleton.
    const own = c.ownPos();
    let aim = 0;
    let bd = 1e9;
    for (const [eid, s] of c.snap) {
      if (eid === c.ownEid) continue;
      if (!/skeleton/.test(c.defIds.get(eid) ?? '')) continue;
      const d = (s.x - own.x) ** 2 + (s.y - own.y) ** 2;
      if (d < bd && s.hpPct > 0) {
        bd = d;
        aim = Math.atan2(s.y - own.y, s.x - own.x);
      }
    }
    c.frame(ATTACK, aim);
    await sleep(60);
    c.frame(0, aim);
    const combo = await c.waitFor((m) => m.t === 'combo', 'swing', 3000, m0).catch(() => null);
    if (!combo) continue;
    const hit = await c
      .waitFor((m) => m.t === 'hit' && m.at >= combo.at && m.eid !== c.ownEid, 'impact', 800, m0)
      .catch(() => null);
    if (hit) gaps.push(hit.at - combo.at);
    await sleep(250);
  }
  receipt(
    'THE HONEST SWING: impacts land on the choreography frame, not the press',
    gaps.length >= 3 && gaps.every((g) => g >= 40 && g <= 320),
    `press->impact ${gaps.join('/')}ms (windup 2t = ~100ms)`,
  );

  // ------------------------------------------------- D. the eight hands
  // THE GUARD SWEEP: wand basics at the doorstep strike with the pole.
  await c.give('carved_staff');
  await c.equip('carved_staff');
  await sleep(1200); // the pack crowds back in
  await restStringDead(c);
  const poseFrom = c.ownPoses.length;
  await holdFor(c, 2);
  const posesSeen = c.ownPoses.slice(poseFrom).map((p) => p.pose);
  const steelBeats = posesSeen.filter(
    (p) => p === PoseState.Attack || p === PoseState.Attack2,
  ).length;
  receipt(
    'THE GUARD SWEEP: at the doorstep the wand strikes with the pole',
    steelBeats >= 1,
    `pose bytes ${posesSeen.join('/')} (Attack=2/Attack2=9 = pole, Cast=6 = bolt)`,
  );

  // THE KNIFE'S HUNGER: a landed dagger basic quickens the feet.
  await c.give('shiv');
  await c.equip('shiv'); // staff -> shiv swaps main
  await restStringDead(c);
  from = c.mark();
  await holdFor(c, 5);
  const hunger = await c
    .waitFor((m) => m.t === 'ride' && Math.abs((m.mult ?? 1) - 1.1) < 0.02, 'hunger', 4000, from)
    .catch(() => null);
  receipt(
    "THE KNIFE'S HUNGER: landed knife work quickens the feet",
    hunger !== null,
    hunger ? `ride mult ${hunger.mult}` : 'no speed pulse seen',
  );
  from = c.mark();
  const cooled = await c
    .waitFor((m) => m.t === 'ride' && Math.abs((m.mult ?? 1) - 1) < 0.001, 'cooldown', 4000, from)
    .catch(() => null);
  receipt('the hunger cools when the knife rests', cooled !== null);

  // THE WEAVE: knife main + sword off — the second one-hander takes
  // the off hand (dualwield unlocked at onehand 10), two blades, one
  // string.
  await c.give('bronze_sword');
  await c.equip('bronze_sword'); // straight to the off hand
  await restStringDead(c);
  from = c.mark();
  await holdFor(c, 2);
  await sleep(400);
  const hits = c.since(from, 'hit');
  receipt(
    'THE WEAVE: the off blade echoes the string (two voices per beat)',
    hits.length >= 3,
    `${hits.length} impacts from 2 swings`,
  );

  // ------------------------------------------- E. the bow, on open ground
  const here = c.ownPos();
  await c.cmd(`/tp ${Math.round(here.x + 40)} ${Math.round(here.y)}`);
  await sleep(800);
  await c.give('shortbow');
  await c.cmd('/give arrow 50');
  await sleep(400);
  await c.equip('shortbow');
  await sleep(200);

  // A plain full draw: one arrow.
  const arrowsBefore = [...c.defIds.entries()].filter(([, d]) => d === 'archery').length;
  for (let i = 0; i < DRAW_FULL_TICKS + 2; i++) {
    c.frame(ATTACK, 0);
    await sleep(TICK);
  }
  c.frame(0, 0);
  await sleep(600);
  const afterSingle = [...c.defIds.entries()].filter(([, d]) => d === 'archery').length;
  receipt(
    'a full draw looses ONE shaft',
    afterSingle - arrowsBefore === 1,
    `${afterSingle - arrowsBefore} arrows`,
  );

  // THE OVERCHARGE VOLLEY: held past full, the release fans three.
  await sleep(600);
  for (let i = 0; i < DRAW_FULL_TICKS + OVERCHARGE_TICKS + 3; i++) {
    c.frame(ATTACK, 0);
    await sleep(TICK);
  }
  c.frame(0, 0);
  await sleep(600);
  const afterVolley = [...c.defIds.entries()].filter(([, d]) => d === 'archery').length;
  receipt(
    'THE OVERCHARGE VOLLEY: held past full, the release fans THREE',
    afterVolley - afterSingle === 3,
    `${afterVolley - afterSingle} arrows`,
  );

  // ------------------------------------------------ F. cadence contract
  await c.equip('bronze_sword');
  await restStringDead(c);
  from = c.mark();
  const t0 = Date.now();
  while (Date.now() - t0 < 5000) {
    c.frame(ATTACK, 0);
    await sleep(45);
  }
  c.frame(0, 0);
  await sleep(200);
  const swordSwings = c.since(from, 'combo').length;
  // Cycle 35 ticks / 4 swings = 437ms per swing -> ~11.4 in 5s.
  receipt(
    'CADENCE CONTRACT: the sword holds its measured line',
    swordSwings >= 10 && swordSwings <= 13,
    `${swordSwings} swings in 5s (expected ~11)`,
  );

  await c.give('iron_greatblade'); // self-sufficient: a spill upstream never starves this receipt
  await c.equip('iron_greatblade');
  await restStringDead(c);
  from = c.mark();
  const t1 = Date.now();
  while (Date.now() - t1 < 5000) {
    c.frame(ATTACK, 0);
    await sleep(45);
  }
  c.frame(0, 0);
  await sleep(200);
  const greatSwings = c.since(from, 'combo').length;
  // Cycle 43.2 ticks / 3 swings = 720ms per swing -> ~6.9 in 5s.
  receipt(
    'CADENCE CONTRACT: the mountain keeps its slow breath',
    greatSwings >= 6 && greatSwings <= 8,
    `${greatSwings} swings in 5s (expected ~7)`,
  );

  console.log(`\nALL ${passed} RECEIPTS PAID. THE PROVING stands.`);
  c.ws.close();
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
