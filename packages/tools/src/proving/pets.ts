/**
 * THE PROVING — live receipts for THE OPEN HAND and THE FANG BESIDE
 * YOU (docs/beastcraft-plan.md Phases 1-2), driven over the real wire
 * against the running dev server. Registers a throwaway keeper and
 * walks the whole law: the join mirror, every spoken refusal, the
 * broken kneel that costs nothing, the true gentling with its
 * ceremony, the collar tag, the heel across real ground, trailing and
 * the calm re-emergence (underground, where the saddle refuses and
 * the companion follows), the untouchable-body law — then the fight:
 * DEFEND THE HAND, THE HARRY holding a mob off the keeper, whiff-0 on
 * live rolls, the xp discipline (beastcraft trickle, never a combat
 * school), kill credit, the mob-side rail wounding the pet, the
 * interim fall and its rest — then THREE STALLS and a full logout:
 * the DB is the animal.
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

// Overridable so a proving run can aim at an isolated rig (own port,
// own database) when the shared dev server is being hot-reloaded by
// a concurrent session's edits.
const URL = process.env.ARX_PROVE_URL ?? 'ws://localhost:8790/ws';
const STAMP = process.argv[2] ?? String(Math.floor(Math.random() * 1e6));
const USER = `keeper_${STAMP}`;
const CHAR = `Keeper ${STAMP}`;

type Msg = Record<string, any>;
const ATTACK = 1 << 0;

type Sample = { x: number; y: number; pose: number; hpPct: number; status: number; at: number };

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
          const s: Sample = { x: e.x, y: e.y, pose: e.pose, hpPct: e.hpPct, status: e.status, at: Date.now() };
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
  // The chat bucket eats rapid teleports silently — verify arrival
  // and ask again rather than run the next receipt from the wrong
  // county (a lesson paid for twice now).
  for (let i = 0; i < 3; i++) {
    await say(c, `/tp ${x} ${y}`);
    await sleep(300);
    if (c.pos && Math.hypot(c.pos.x - x, c.pos.y - y) < 6) return;
  }
  throw new Error(
    `tp to ${x},${y} never landed (standing at ${c.pos?.x.toFixed(1)},${c.pos?.y.toFixed(1)})`,
  );
}

/** Teleport far from here, trying offsets until one lands on ground. */
async function tpFarFrom(c: Client, base: [number, number]): Promise<void> {
  for (const [ox, oy] of [
    [-70, -45],
    [-52, 31],
    [64, -27],
    [41, 52],
    [-33, -62],
  ] as Array<[number, number]>) {
    try {
      await tp(c, base[0] + ox, base[1] + oy);
      return;
    } catch {
      // that ground refused — try the next quarter
    }
  }
  throw new Error('no far ground would take the keeper');
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

  // --- Stage: open ground, a thick neck (the beetle bites back), a
  // blade. The course spreads wide per run — earlier runs leave live
  // bears and goblins behind, and inheriting one mid-receipt reads as
  // a law failure when it is only litter.
  const course: [number, number] = [160 + (Number(STAMP) % 97), 40 + (Number(STAMP) % 61)];
  await tp(c, course[0], course[1]);
  // Level-99 constitution: the combat block later feeds the keeper to
  // a bear on purpose, and the receipt is the PET's fall, not the
  // keeper's (live-caught: a worn keeper died first and the death
  // teleport dissolved the fight before the fall could land).
  await say(c, '/xp vitality 13000000');
  await say(c, '/xp defence 13000000');
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
  // Scoped to the spawn mark AND to unowned bodies: another keeper's
  // companion (a live keeper idling at the Dawnmead pen, say) enters
  // the stream at register time and courting it is a silent refusal
  // by law (live-caught: the harness spent two runs proposing to a
  // browser session's beetle).
  const beetleMeta = c.msgs
    .slice(mark)
    .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
    .find((e: Msg) => e.defId === 'giant_beetle' && e.ownerEid === undefined);
  const beetle: number = beetleMeta.eid;
  await sleep(400);

  // Interact reach is 2.2 tiles and rejects silently — walk up first,
  // every time (the beetle wanders, and the spawn ring is 1.0-3.4).
  const walkTo = async (targetEid: number, within = 1.3): Promise<void> => {
    // A long gap gets the dev lift first — walking a wandering body
    // down across open country is not what these receipts measure.
    const far = c.ents.get(targetEid);
    if (far && c.pos && Math.hypot(far.x - c.pos.x, far.y - c.pos.y) > 4) {
      await tp(c, Math.round(far.x), Math.round(far.y) + 1);
    }
    const t0 = Date.now();
    let sidled = 0;
    for (;;) {
      if (Date.now() - t0 > 16000) {
        const b = c.ents.get(targetEid);
        const me = c.pos;
        throw new Error(
          `could not reach entity ${targetEid} (d ${b && me ? Math.hypot(b.x - me.x, b.y - me.y).toFixed(1) : '?'})`,
        );
      }
      // A boulder or a trunk on the straight line: sidle around it by
      // asking the dev lift for another shoulder — all four in turn
      // (live-caught: a downed body against a rock line left the one
      // authored shoulder blocked too), and a refused shoulder never
      // kills the walk.
      if (sidled < 4 && Date.now() - t0 > 5000 + sidled * 3000) {
        const b2 = c.ents.get(targetEid);
        if (b2) {
          const spots: Array<[number, number]> = [
            [Math.round(b2.x) - 1, Math.round(b2.y)],
            [Math.round(b2.x) + 1, Math.round(b2.y)],
            [Math.round(b2.x), Math.round(b2.y) + 1],
            [Math.round(b2.x), Math.round(b2.y) - 1],
          ];
          const [sx, sy] = spots[sidled % spots.length]!;
          sidled++;
          try {
            await tp(c, sx, sy);
          } catch {
            /* refused ground: the next shoulder answers */
          }
        }
      }
      const b = c.ents.get(targetEid);
      const me = c.pos;
      if (b && me) {
        const d = Math.hypot(b.x - me.x, b.y - me.y);
        if (d <= within) {
          c.frame(0);
          await sleep(150);
          return;
        }
        const aim = Math.atan2(b.y - me.y, b.x - me.x);
        c.frame(0, Math.cos(aim), Math.sin(aim), aim);
      }
      await sleep(60);
    }
  };

  // ==== THE WILD ANSWERS THE CALL (docs/beastcraft-arts-plan.md): the
  // tame is a technique now — seated on Q, cast at the beast, survived.

  const killTarget = async (targetEid: number, label: string): Promise<void> => {
    const t0 = Date.now();
    let lastNear = Date.now();
    for (;;) {
      if (Date.now() - t0 > 50000) throw new Error(`could not fell ${label}`);
      const b = c.ents.get(targetEid);
      if (!b || b.hpPct === 0 || Date.now() - b.at > 2000) return;
      const me = c.pos!;
      const d = Math.hypot(b.x - me.x, b.y - me.y);
      const aim = Math.atan2(b.y - me.y, b.x - me.x);
      // Swing whenever plausibly in reach — a circling mob spends
      // half its time on the gate's far side, and pressing early
      // costs nothing (the cone forgives, the whiff is honest).
      if (d > 1.9) {
        // A grown tree line pins a straight walk forever (no client
        // pathing) — after 6s of failing to close, take the dev lift
        // to the mob's shoulder (the walkTo sidle, weaponized).
        if (Date.now() - lastNear > 3500) {
          lastNear = Date.now();
          await tp(c, Math.round(b.x), Math.round(b.y) + 1);
          continue;
        }
        c.frame(0, Math.cos(aim), Math.sin(aim), aim);
        await sleep(60);
        continue;
      }
      lastNear = Date.now();
      c.frame(ATTACK, 0, 0, aim);
      await sleep(80);
      c.frame(0, 0, 0, aim);
      await sleep(380);
    }
  };

  /** One cast press-edge of Ability1 (Q seat), aimed at a body. */
  const castAt = async (targetEid: number): Promise<void> => {
    const b = c.ents.get(targetEid);
    const me = c.pos;
    const aim = b && me ? Math.atan2(b.y - me.y, b.x - me.x) : 0;
    c.frame(8, 0, 0, aim); // Ability1 = 1 << 3, press edge
    await sleep(80);
    c.frame(0, 0, 0, aim);
  };

  // --- THE SEAT GATE: below the rung, the codex refuses the seat.
  mark = c.mark();
  c.send({ t: 'technique', ability: 'gentle_the_wild', slot: 0 });
  await c.waitFor(
    (m) => m.t === 'chat' && /unlocks at beastcraft level 10/.test(m.text ?? ''),
    'seat refusal',
    5000,
    mark,
  );
  receipt('the ladder gates the seat: an unlearned art refuses, aloud', true);

  // --- THE SCHOOL OPENS: at the rung, the art takes the Q seat.
  await say(c, '/xp beastcraft 1200');
  mark = c.mark();
  c.send({ t: 'technique', ability: 'gentle_the_wild', slot: 0 });
  await c.waitFor(
    (m) => m.t === 'techniques' && m.chosen?.[0] === 'gentle_the_wild',
    'the art takes the seat',
    5000,
    mark,
  );
  receipt('THE SCHOOL OPENS: Gentle the Wild takes the seat at beastcraft 10', true);

  // --- Refusal: an empty cone. The call finds nothing, costs nothing.
  {
    const b0 = c.ents.get(beetle);
    const bx = b0 ? Math.round(b0.x) : course[0];
    const by = b0 ? Math.round(b0.y) : course[1];
    let landed = false;
    for (const [ox, oy] of [[40, 30], [44, 18], [31, 42]] as const) {
      try {
        await tp(c, bx + ox, by + oy);
        landed = true;
        break;
      } catch {
        /* refused ground: the next offset asks elsewhere */
      }
    }
    if (!landed) throw new Error('no ground for the empty-cone receipt');
    mark = c.mark();
    await castAt(-1);
    await c.waitFor(
      (m) => m.t === 'chat' && /Nothing wild in reach answers the call/.test(m.text ?? ''),
      'empty-cone refusal',
      5000,
      mark,
    );
    receipt('an empty cone refuses, aloud, and nothing is spent', true);
  }

  // --- Refusal: the rung, spoken through the cast door (a mudcrab
  // asks for beastcraft 15; the keeper stands at 10).
  {
    mark = c.mark();
    await say(c, '/spawnmob mudcrab 1');
    await c.waitFor(
      (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.defId === 'mudcrab' && e.ownerEid === undefined),
      'mudcrab enters',
      6000,
      mark,
    );
    const crab = c.msgs
      .slice(mark)
      .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
      .find((e: Msg) => e.defId === 'mudcrab' && e.ownerEid === undefined).eid;
    await walkTo(crab, 3);
    mark = c.mark();
    await castAt(crab);
    await c.waitFor(
      (m) => m.t === 'chat' && /need beastcraft level 15/.test(m.text ?? ''),
      'rung refusal via cast',
      5000,
      mark,
    );
    receipt('the rung refuses through the cast, aloud, and teaches the number', true);
    await killTarget(crab, 'the mudcrab');
  }

  // --- Refusal: the empty pack (right rung, no lure in the cone).
  await walkTo(beetle, 3);
  mark = c.mark();
  await castAt(beetle);
  await c.waitFor(
    (m) => m.t === 'chat' && /noses your pack for berries/.test(m.text ?? ''),
    'lure refusal',
    5000,
    mark,
  );
  receipt('the empty pack refuses, and names the lure', true);

  // --- The cast pays a real cooldown (10s) only when a channel truly
  // opens — refusals are free. Track paid casts so the next one waits.
  let lastPaidCastAt = 0;
  const waitTameCd = async (): Promise<void> => {
    const left = lastPaidCastAt + 10600 - Date.now();
    if (left > 0) await sleep(left);
  };

  /** Wear a body into the craven window (whiff-0 makes it a real fight). */
  const swingUntilWorn = async (markEid: number): Promise<void> => {
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 60000) {
        const b = c.ents.get(markEid);
        const me = c.pos;
        throw new Error(
          `could not wear ${markEid} down in 60s (hpPct ${b?.hpPct}, d ${b && me ? Math.hypot(b.x - me.x, b.y - me.y).toFixed(2) : '?'})`,
        );
      }
      const b = c.ents.get(markEid);
      const me = c.pos;
      if (b && b.hpPct > 0 && b.hpPct <= WINDOW_PCT) return;
      if (!b || b.hpPct === 0) throw new Error('the mark died — the wound overshot the window');
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

  // --- THE BROKEN ASKING: open the channel on the whole beetle, then
  // walk. The channel breaks and the lure is still whole.
  await say(c, '/give berries 5');
  await walkTo(beetle, 2.5);
  mark = c.mark();
  lastPaidCastAt = Date.now();
  await castAt(beetle);
  const brokenStart = await c.waitFor((m) => m.t === 'action' && m.state === 'start', 'the asking opens', 5000, mark);
  receipt('a whole heart takes the FULL asking: the channel opens at 200 ticks', brokenStart.ticks === 200, `ticks ${brokenStart.ticks}`);
  const walkT0 = Date.now();
  while (Date.now() - walkT0 < 1400) {
    c.frame(0, -1, 0);
    await sleep(50);
  }
  c.frame(0);
  await c.waitFor((m) => m.t === 'action' && m.state === 'stop', 'the asking breaks', 5000, mark);
  {
    const still = c.latest('inv')?.slots.find((s: any) => s && s.item === 'berries')?.qty ?? 0;
    receipt('moving breaks the asking, and it costs nothing', still === 5, `berries ${still}`);
  }

  // The teeth ahead are real chip damage on a fresh keeper — stock
  // the pack once; each block chugs what it needs.
  {
    mark = c.mark();
    await say(c, '/give healing_tincture 6');
    await c.waitFor((m) => m.t === 'inv', 'tinctures in pack', 5000, mark);
  }
  const chug = async (n: number): Promise<void> => {
    for (let i = 0; i < n; i++) {
      const ts = c.latest('inv')?.slots.findIndex((s: any) => s && s.item === 'healing_tincture') ?? -1;
      if (ts < 0) return;
      c.send({ t: 'use', slot: ts });
      await sleep(700);
    }
  };

  // --- THE CRAVEN ACCELERATOR, first (live-caught ordering law): this
  // receipt must run BEFORE any companion exists — a heel friend joins
  // the wear-down through the quiet defend door and then kills or
  // re-wounds the worn mark straight through the cooldown wait. It
  // also runs on SEPARATE ground, out past the provoked first
  // beetle's leash, so the cone holds exactly one candidate.
  {
    let landed = false;
    for (const [ox, oy] of [[60, 45], [52, 18], [38, 55]] as const) {
      try {
        await tp(c, course[0] + ox, course[1] + oy);
        landed = true;
        break;
      } catch {
        /* refused ground: the next offset asks elsewhere */
      }
    }
    if (!landed) throw new Error('no ground for the craven receipt');
    mark = c.mark();
    await say(c, '/spawnmob giant_beetle 1');
    await c.waitFor(
      (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.defId === 'giant_beetle' && e.ownerEid === undefined),
      'second beetle enters',
      6000,
      mark,
    );
    const beetle2 = c.msgs
      .slice(mark)
      .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
      .find((e: Msg) => e.defId === 'giant_beetle' && e.ownerEid === undefined && e.eid !== beetle).eid;
    await walkTo(beetle2);
    await swingUntilWorn(beetle2);
    const worn = c.ents.get(beetle2)!;
    receipt(
      'the wound opens the short road: the second beetle stands craven',
      worn.hpPct > 0 && worn.hpPct <= WINDOW_PCT,
      `hpPct ${worn.hpPct}/${WINDOW_PCT}`,
    );
    await chug(1);
    await waitTameCd();
    mark = c.mark();
    lastPaidCastAt = Date.now();
    const cravenT0 = Date.now();
    await castAt(beetle2);
    const cravenStart = await c.waitFor((m) => m.t === 'action' && m.state === 'start', 'the short asking opens', 5000, mark);
    const ceremony2 = await c.waitFor((m) => m.t === 'pet' && m.ceremony !== undefined, 'the short ceremony', 10000, mark);
    const cravenMs = Date.now() - cravenT0;
    receipt(
      'THE CRAVEN ACCELERATOR: a worn heart answers in half the asking',
      cravenStart.ticks === 100 && cravenMs >= 4200 && cravenMs <= 8500,
      `ticks ${cravenStart.ticks}, ${(cravenMs / 1000).toFixed(1)}s`,
    );
    await say(c, `/tame drop ${ceremony2.ceremony}`);
    await c.waitFor((m) => m.t === 'pet' && m.pets?.length === 0, 'the short-road friend returned (dev)', 5000);
  }

  // --- THE SURVIVAL TAME: cast on the whole beetle and STAND. The
  // working provokes it; teeth land on the keeper the whole channel
  // and break nothing; the finish is the same old ceremony.
  await chug(3);
  await waitTameCd();
  await walkTo(beetle, 2.5);
  // A wound during the channel must be CERTAIN, never dice (live-
  // caught: ten whole seconds of beetle rolls once came up all
  // whiffs and the bleed read as a lottery). A goblin dropped at
  // arm's length opens on the keeper at once — the spawn ring's
  // documented instant aggro — so the receipt proves keeper blood
  // AND a third party's teeth break nothing. It is not tamable, so
  // the cone never sees it.
  mark = c.mark();
  await say(c, '/spawnmob goblin 1');
  await c.waitFor(
    (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.defId === 'goblin' && e.ownerEid === undefined),
    'the chewer enters',
    6000,
    mark,
  );
  const chewer = c.msgs
    .slice(mark)
    .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
    .find((e: Msg) => e.defId === 'goblin' && e.ownerEid === undefined).eid;
  const hpBefore = c.eid !== null ? (c.ents.get(c.eid)?.hpPct ?? 255) : 255;
  mark = c.mark();
  lastPaidCastAt = Date.now();
  const castT0 = Date.now();
  await castAt(beetle);
  await c.waitFor((m) => m.t === 'action' && m.state === 'start', 'the asking opens again', 5000, mark);
  const ceremony = await c.waitFor((m) => m.t === 'pet' && m.ceremony !== undefined, 'the ceremony', 16000, mark);
  const channelMs = Date.now() - castT0;
  const hpDuring = c.eid !== null ? (c.ents.get(c.eid)?.hpPct ?? 255) : 255;
  const tamed = ceremony.pets.find((p: Msg) => p.slot === ceremony.ceremony);
  receipt(
    'THE WILD ANSWERS THE CALL: survive the asking and the beetle is yours',
    tamed?.species === 'giant_beetle' && tamed?.state === 'heel' && tamed?.level === 6,
    `slot ${ceremony.ceremony}, level ${tamed?.level}`,
  );
  receipt(
    'the whole heart holds the full ten seconds',
    channelMs >= 9200 && channelMs <= 15000,
    `${(channelMs / 1000).toFixed(1)}s`,
  );
  receipt(
    'THE TEETH BREAK NOTHING: the keeper bled through the channel and the working held',
    hpDuring < hpBefore,
    `hpPct ${hpBefore} -> ${hpDuring}`,
  );
  await c.waitFor((m) => m.t === 'chat' && /It is yours now/.test(m.text ?? ''), 'ceremony line', 5000, mark);
  {
    // Five given; the craven finish spent one, this finish spends one,
    // and the broken asking spent NOTHING — three remain.
    const left = c.latest('inv')?.slots.find((s: any) => s && s.item === 'berries')?.qty ?? 0;
    receipt('each finish spends one lure, the broken asking spent none', left === 3, `berries ${left}`);
  }
  await killTarget(chewer, 'the chewer');

  // --- THE WOUND BREAKS THE ASKING: a third beetle, a channel opened,
  // then the keeper's own steel touches the mark — the working dies
  // and the lure survives.
  {
    mark = c.mark();
    await say(c, '/spawnmob giant_beetle 1');
    await c.waitFor(
      (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.defId === 'giant_beetle' && e.ownerEid === undefined),
      'third beetle enters',
      6000,
      mark,
    );
    const beetle3 = c.msgs
      .slice(mark)
      .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
      .find((e: Msg) => e.defId === 'giant_beetle' && e.ownerEid === undefined).eid;
    const lureBefore = c.latest('inv')?.slots.find((s: any) => s && s.item === 'berries')?.qty ?? 0;
    // The keeper has been chewed on for two receipts straight — top
    // up before standing in a third set of teeth.
    await chug(1);
    await waitTameCd();
    await walkTo(beetle3, 2.0);
    mark = c.mark();
    lastPaidCastAt = Date.now();
    await castAt(beetle3);
    await c.waitFor((m) => m.t === 'action' && m.state === 'start', 'the third asking opens', 5000, mark);
    await sleep(900);
    // Swing until steel writes (whiff-0: a whiff breaks nothing, so
    // keep swinging until the stop proves a wound landed).
    const stopMark = mark;
    const swingT0 = Date.now();
    let stopped: Msg | null = null;
    while (!stopped && Date.now() - swingT0 < 20000) {
      const b = c.ents.get(beetle3);
      const me = c.pos;
      if (b && me) {
        const aim = Math.atan2(b.y - me.y, b.x - me.x);
        c.frame(ATTACK, 0, 0, aim);
        await sleep(80);
        c.frame(0, 0, 0, aim);
      }
      stopped = c.msgs.slice(stopMark).find((m) => m.t === 'action' && m.state === 'stop') ?? null;
      await sleep(300);
    }
    const lureAfter = c.latest('inv')?.slots.find((s: any) => s && s.item === 'berries')?.qty ?? 0;
    receipt(
      'a wound to the beast breaks the asking, and the lure survives',
      stopped !== null && stopped.reason === 'hurt' && lureAfter === lureBefore,
      `reason ${stopped?.reason}, berries ${lureBefore} -> ${lureAfter}`,
    );
    await killTarget(beetle3, 'the third beetle');
    // The fight's dev lifts may have trailed the companion — stand
    // calm until the body re-emerges (the downstream receipts count
    // on a live second entity, not a promise of one).
    const calm0 = Date.now();
    while (c.petEids(c.eid).length < 1 && Date.now() - calm0 < 15000) {
      c.frame(0);
      await sleep(250);
    }
  }

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

  // ==== THE FANG BESIDE YOU (Phase 2) ====================================

  // Fresh surface ground for the fight, clear of the tame-spot litter.
  await tp(c, course[0] + 14, course[1] + 10);
  await sleep(600);
  const livePet = (): number | null => {
    let best: number | null = null;
    for (const eid2 of c.petEids(c.eid)) {
      const s = c.ents.get(eid2);
      if (s && Date.now() - s.at < 1500) best = eid2;
    }
    return best;
  };
  const petNow = livePet();
  if (petNow === null) throw new Error('no live companion for the combat block');

  // Track every hit broadcast for the whiff ledger as we go.
  const hitZeros = () =>
    c.msgs.filter((m) => m.t === 'hit' && m.dmg === 0 && !m.warded).length;
  const zerosBefore = hitZeros();

  // The keeper opens with ONE landed blow, then stands down. The
  // world is alive (wild knots roam, mobs kite and flee), so the
  // helper refuses stale samples and the stager retries whole mobs.
  const landOne = async (targetEid: number, label: string, timeoutMs = 20000): Promise<void> => {
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > timeoutMs) throw new Error(`could not land a blow on ${label}`);
      const b = c.ents.get(targetEid);
      const me = c.pos;
      if (!b || !me || Date.now() - b.at > 1500 || b.hpPct === 0) {
        // Dead, despawned, or out of the interest window — hopeless.
        throw new Error(`${label} is gone or stale`);
      }
      const d = Math.hypot(b.x - me.x, b.y - me.y);
      const aim = Math.atan2(b.y - me.y, b.x - me.x);
      if (d > 1.4) {
        c.frame(0, Math.cos(aim), Math.sin(aim), aim);
        await sleep(60);
        continue;
      }
      const hm = c.mark();
      c.frame(ATTACK, 0, 0, aim);
      await sleep(80);
      c.frame(0, 0, 0, aim);
      await sleep(450);
      const landed = c.msgs
        .slice(hm)
        .some((m) => m.t === 'hit' && m.eid === targetEid && (m.dmg ?? 0) > 0);
      if (landed) return;
    }
  };
  /** Swing at a mob until it is dead — the keeper cleans up. */
  /** Spawn a mob and open on it, retrying whole bodies on stage flakes. */
  const stageFight = async (species: string, label: string): Promise<number> => {
    let lastEid: number | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const sm = c.mark();
      await say(c, `/spawnmob ${species} 1`);
      try {
        await c.waitFor(
          (m) =>
            (m.t === 'enter' || m.t === 'update') &&
            m.entities?.some((e: Msg) => e.defId === species),
          `${label} enters`,
          6000,
          sm,
        );
        const eid2: number = c.msgs
          .slice(sm)
          .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
          .find((e: Msg) => e.defId === species && e.ownerEid === undefined).eid;
        await sleep(300);
        lastEid = eid2;
        await landOne(eid2, label);
        return eid2;
      } catch (err) {
        if (attempt === 3) throw err;
        console.log(`  (stage flake on ${label}, attempt ${attempt}: ${String((err as Error).message)} — sweeping and respawning)`);
        // A failed stage's mob is live litter that steals the pet's
        // attention from the NEXT stage's mark — sweep it first.
        if (lastEid !== null) {
          const smp = c.ents.get(lastEid);
          if (smp && smp.hpPct > 0 && Date.now() - smp.at < 2500) {
            await killTarget(lastEid, `${label} (failed stage)`);
          }
          lastEid = null;
        }
        // Bad ground refuses spawns whole, or seats them across a
        // rock line the walk can never cross (live-caught: a course
        // lottery pocketed the kit stage and three asks landed
        // nothing) — shift the stage before asking again.
        const me = c.pos;
        if (me) {
          for (const [ox, oy] of [[11, -7], [-13, 9], [7, 13]] as const) {
            try {
              await tp(c, Math.round(me.x) + ox * attempt, Math.round(me.y) + oy);
              break;
            } catch {
              /* refused ground: the next offset asks elsewhere */
            }
          }
          await sleep(500);
        }
      }
    }
    throw new Error('unreachable');
  };

  const goblinEid = await stageFight('goblin', 'the goblin');
  await sleep(700); // the keeper's own xp lines land before the window opens
  const soloMark = c.mark();

  // DEFEND THE HAND: the keeper stands idle; the companion carries it.
  const gob0 = c.ents.get(goblinEid)?.hpPct ?? 255;
  await (async () => {
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 25000) throw new Error('the companion never took the fight');
      c.frame(0);
      const g = c.ents.get(goblinEid);
      if (!g || g.hpPct === 0 || g.hpPct < gob0 - 20) return;
      await sleep(120);
    }
  })();
  receipt('DEFEND THE HAND: the keeper points, the companion carries', true);

  // THE HARRY: the mob's eye moves off the keeper and onto the pet.
  // The pet's ENTITY can be re-minted by trailing cycles during stage
  // sweeps — compare against the live body at match time, never a
  // captured eid (live-caught).
  mark = c.mark();
  await say(c, '/npcstate');
  {
    const line = await c.waitFor(
      (m) => m.t === 'chat' && new RegExp(`^goblin#${goblinEid} .*chase tgt=\\d+`).test(m.text ?? ''),
      'goblin brain shows a chase',
      6000,
      mark,
    );
    const tgt = Number(/tgt=(\d+)/.exec(line.text ?? '')?.[1]);
    const nowPet = livePet();
    receipt('THE HARRY: the companion holds the eye', tgt === nowPet, `tgt ${tgt}, pet ${nowPet}`);
  }
  // The clean solo window closes HERE — the next act is a deliberate
  // keeper swing, whose own onehand xp is the keeper's business.
  const soloEndMark = c.mark();

  // The keeper shoots free mid-fight and the eye does not come back.
  await landOne(goblinEid, 'the goblin (mid-fight)');
  await sleep(400);
  mark = c.mark();
  await say(c, '/npcstate');
  const still = await c.waitFor(
    (m) => m.t === 'chat' && new RegExp(`^goblin#${goblinEid} `).test(m.text ?? ''),
    'goblin brain re-read',
    6000,
    mark,
  );
  {
    const tgt2 = Number(/tgt=(\d+)/.exec(still.text ?? '')?.[1]);
    receipt(
      'THE FIRST EYE HOLDS: the keeper shoots free, the mob stays on the pet',
      tgt2 === livePet() || /hp=0/.test(still.text ?? ''),
      still.text,
    );
  }
  const shootFreeMark = c.mark();

  // The pet finishes the mark alone; the ledgers speak.
  await c.waitFor((m) => m.t === 'death' && m.eid === goblinEid, 'the goblin falls', 45000);
  const window = c.msgs.slice(soloMark);
  const xpIn = (skill: string, from = window) =>
    from.filter((m: Msg) => m.t === 'xp' && m.skill === skill).length;
  receipt(
    'the trickle pays the bond: beastcraft xp flowed from the teeth',
    xpIn('beastcraft') >= 1,
    `${xpIn('beastcraft')} grants`,
  );
  const soloToSwing = c.msgs.slice(soloMark, soloEndMark);
  receipt(
    'never a combat school: the pet solo window carries no onehand or combat xp',
    xpIn('onehand', soloToSwing) === 0 && xpIn('combat', soloToSwing) === 0,
  );
  receipt(
    'A COMPANION\'S DEED IS ITS KEEPER\'S: the kill pays the keeper vitality',
    c.msgs.slice(shootFreeMark).some((m) => m.t === 'xp' && m.skill === 'vitality'),
  );
  const mirrorNow = c.latest('pet');
  const heelInfo = mirrorNow?.pets?.find((p: Msg) => p.state === 'heel' || p.state === 'trailing');
  receipt('the pet ladder banks its own xp', (heelInfo?.xp ?? 0) > 0, `xp ${heelInfo?.xp}`);
  const petSample = c.ents.get(petNow);
  receipt(
    'the mob-side rail is real: the companion carries wounds',
    (petSample?.hpPct ?? 255) < 255,
    `hpPct ${petSample?.hpPct}`,
  );
  receipt('whiff-0 on the live wire: some rolls wrote nothing', hitZeros() > zerosBefore, `${hitZeros() - zerosBefore} whiffs`);

  // ==== THE FALL IS NEVER THE END (Phase 3) ==============================

  // Top the keeper up first — /xp raises the ceiling, never the fill
  // (live-caught: a half-full keeper died to the maul mid-receipt).
  const topUp = async (): Promise<void> => {
    const tm = c.mark();
    await say(c, '/give healing_tincture 12');
    await c.waitFor((m) => m.t === 'inv', 'tinctures in pack', 5000, tm);
    for (let i = 0; i < 14; i++) {
      if ((c.pos?.hpPct ?? 0) >= 250) break;
      const invNow = c.latest('inv');
      const tSlot = invNow!.slots.findIndex((x: any) => x && x.item === 'healing_tincture');
      if (tSlot < 0) break;
      c.send({ t: 'use', slot: tSlot });
      await sleep(350);
    }
  };
  /** Feed the heel companion to a fresh bear; return once it is down.
   *  Stages on FRESH ground with the pet verified at heel first —
   *  leftover mobs and drifted fights made the old in-place staging
   *  the flakiest block in the harness. The mark opens BEFORE the
   *  staging — a bear can fell a small friend in the very first
   *  exchange, mid-stage. */
  const downThePet = async (spot: [number, number], retried = false): Promise<void> => {
    const deathMark = c.mark();
    await tp(c, spot[0], spot[1]);
    {
      // The pet must be standing beside us before anything is fed to it.
      const w0 = Date.now();
      for (;;) {
        c.frame(0);
        const lp = livePet();
        const smp = lp !== null ? c.ents.get(lp) : null;
        if (smp && c.pos && Math.hypot(smp.x - c.pos.x, smp.y - c.pos.y) < 8) break;
        if (Date.now() - w0 > 20000) throw new Error('the pet never re-heeled for the staging');
        await sleep(200);
      }
    }
    const bm = c.mark();
    const bearEid = await stageFight('bear', 'the bear');
    const backOff = async () => {
      const backT0 = Date.now();
      while (Date.now() - backT0 < 1300) {
        c.frame(0, -1, 0.3);
        await sleep(50);
      }
      c.frame(0);
    };
    await backOff();
    const t0 = Date.now();
    let probed = 0;
    let collapsed = false;
    let reLit = false;
    for (;;) {
      if (c.msgs.slice(bm).some((m) => m.t === 'chat' && /goes down, breath ragged/.test(m.text ?? ''))) return;
      // The mutual-dodge orbit (bear chases pet chases bear, both
      // stepping out of each other's windups at fixed range — a real
      // emergent wart, noted for Phase 6): collapse the geometry by
      // walking the keeper back into the knot. Sanity-bounded — a
      // ghost sample must never teleport the stage across the map.
      if (!collapsed && Date.now() - t0 > 20000) {
        collapsed = true;
        const lp = livePet();
        const smp = lp !== null ? c.ents.get(lp) : null;
        if (smp && c.pos && Math.hypot(smp.x - c.pos.x, smp.y - c.pos.y) < 30) {
          await tp(c, Math.round(smp.x), Math.round(smp.y) + 1);
        }
      }
      // The stand-off (live-caught at 47 green): the bear sheds its
      // grudge and goes home whole while the pet's every bite CLANKS
      // off its hide — nothing written, nothing provoked (whiff-0
      // holding the door shut on its own staging). One keeper blow
      // re-lights the fight, then step back out of it.
      if (!reLit && Date.now() - t0 > 34000) {
        reLit = true;
        const bs = c.ents.get(bearEid);
        if (bs && bs.hpPct > 0) {
          await landOne(bearEid, 'the bear (re-light)');
          await backOff();
        }
      }
      // The keeper dying dissolves the stage (death teleport drags
      // the pet home) — top up and try once more on fresh ground.
      if (
        !retried &&
        c.msgs.slice(deathMark).some((m) => m.t === 'chat' && /You went down/.test(m.text ?? ''))
      ) {
        console.log('  (the keeper fell mid-stage — topping up and restaging)');
        await topUp();
        await downThePet([spot[0] + 9, spot[1] + 7], true);
        return;
      }
      if (Date.now() - t0 > 60000) {
        await say(c, '/npcstate');
        await sleep(1200);
        console.error('DOWN DEBUG chats:', JSON.stringify(c.msgs.filter((m) => m.t === 'chat').slice(-12).map((m) => m.text)));
        console.error('DOWN DEBUG mirror:', JSON.stringify(c.latest('pet')?.pets));
        throw new Error('timeout waiting for the down line');
      }
      if (Date.now() - t0 > probed * 6000) {
        probed++;
        c.send({ t: 'chat', text: '/petstate' });
      }
      await sleep(200);
    }
  };
  await topUp();
  await downThePet([course[0] + 26, course[1] + 16]);

  // The body STAYS: breathing at zero, lying, mirror saying so.
  await sleep(600);
  const downedEid = livePet();
  const downedSample = downedEid !== null ? c.ents.get(downedEid) : null;
  receipt(
    'the fall leaves a body, not an absence: lying at zero, still on the wire',
    downedEid !== null && downedSample?.hpPct === 0 && downedSample?.pose === 16,
    `pose ${downedSample?.pose}, hpPct ${downedSample?.hpPct}`,
  );
  const downMirror = await c.waitFor(
    (m) => m.t === 'pet' && m.pets?.some((p: Msg) => p.state === 'downed'),
    'the mirror says downed',
    6000,
  );
  receipt('the mirror carries the vigil: state downed', downMirror.pets.some((p: Msg) => p.state === 'downed'));

  // The kneel needs quiet: fell every live bear (walking away is not
  // an option — past the trail-out the fled exit sends the friend
  // home, Phase 3's own law, learned the hard way).
  await say(c, '/xp onehand 13000000');
  /**
   * GUARD THE VIGIL: stand AT the fallen body and slay only what
   * comes within reach. Never chase — the kill-chase lift once
   * followed a homeward-leashing bear past the trail-out and the
   * KEEPER fled his own vigil (diagnosed from the wire). A bear that
   * keeps its distance is no threat to the kneel: it is provoked-only
   * and cannot re-open on a keeper it has lost.
   */
  const guardTheVigil = async (bodyEid: number): Promise<void> => {
    const t0 = Date.now();
    let quietSince = Date.now();
    for (;;) {
      if (Date.now() - t0 > 45000) return; // enough — the kneel decides
      const body = c.ents.get(bodyEid);
      const me = c.pos!;
      // Hold position beside the body.
      if (body && Math.hypot(body.x - me.x, body.y - me.y) > 2.2) {
        const aim = Math.atan2(body.y - me.y, body.x - me.x);
        c.frame(0, Math.cos(aim), Math.sin(aim), aim);
        await sleep(60);
        continue;
      }
      const threats = c.msgs
        .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
        .filter((e: Msg) => e.defId === 'bear' && e.ownerEid === undefined)
        .map((e: Msg) => e.eid)
        .filter((e2: number, i: number, arr: number[]) => arr.indexOf(e2) === i)
        .map((e2: number) => c.ents.get(e2))
        .filter((smp: Sample | undefined): smp is Sample => !!smp && smp.hpPct > 0 && Date.now() - smp.at < 2000)
        .filter((smp: Sample) => Math.hypot(smp.x - me.x, smp.y - me.y) < 2.6);
      if (threats.length > 0) {
        quietSince = Date.now();
        const b = threats[0]!;
        const aim = Math.atan2(b.y - me.y, b.x - me.x);
        c.frame(ATTACK, 0, 0, aim);
        await sleep(80);
        c.frame(0, 0, 0, aim);
        await sleep(380);
        continue;
      }
      if (Date.now() - quietSince > 6000) return;
      c.frame(0);
      await sleep(250);
    }
  };
  /** Walk to a downed body and kneel until the given rise line lands.
   *  Kneeling hands need an unbloodied keeper (the tend breaks on
   *  every landed wound INCLUDING DoT ticks — found live, kept as
   *  design: you stop bleeding before you tend), so each attempt
   *  first waits out the keeper's own statuses and re-guards the
   *  vigil against whatever is still pressing. */
  const tendAt = async (bodyEid: number, riseRe: RegExp, label: string): Promise<void> => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Let the bleed dry: a ticking wound breaks every kneel.
      {
        const w0 = Date.now();
        while (Date.now() - w0 < 9000 && (c.pos?.status ?? 0) !== 0) {
          c.frame(0);
          await sleep(250);
        }
      }
      await walkTo(bodyEid, 1.8);
      const tm = c.mark();
      c.send({ t: 'interactnpc', eid: bodyEid });
      try {
        await c.waitFor((m) => m.t === 'action' && m.state === 'start', `${label} kneel starts`, 5000, tm);
        await c.waitFor((m) => m.t === 'chat' && riseRe.test(m.text ?? ''), `${label} rise`, 9000, tm);
        return;
      } catch (err) {
        if (attempt === 3) {
          const dsmp = c.ents.get(bodyEid);
          console.error(`${label} DEBUG mirror:`, JSON.stringify(c.latest('pet')?.pets));
          console.error(`${label} DEBUG body:`, JSON.stringify(dsmp), 'me:', JSON.stringify(c.pos));
          console.error(`${label} DEBUG chats:`, JSON.stringify(c.msgs.filter((m) => m.t === 'chat').slice(-8).map((m) => m.text)));
          throw err;
        }
        // Something is still pressing the vigil — stand and settle it.
        await guardTheVigil(bodyEid);
      }
    }
  };

  await guardTheVigil(downedEid!);
  const stillDown = downedEid !== null ? c.ents.get(downedEid) : null;
  receipt(
    'a fallen body takes no further wounds, and no mob worries it',
    stillDown != null && stillDown.hpPct === 0,
  );

  // THE TEND: kneel to it where it lies; it rises shaky.
  mark = c.mark();
  await tendAt(downedEid!, /finds its feet/, 'tend');
  const tendXp = c.msgs.slice(mark).some((m) => m.t === 'xp' && m.skill === 'beastcraft');
  await sleep(500);
  const risen = c.ents.get(downedEid!);
  receipt(
    'THE TEND: the friend rises where it fell, shaky but standing',
    risen !== undefined && risen.hpPct > 60 && risen.hpPct < 140 && tendXp,
    `hpPct ${risen?.hpPct}, tend xp ${tendXp}`,
  );

  // THE BOND MOMENT: its own lure, offered by hand — then the plain
  // pat while the snack clock runs. The staging can cost the keeper
  // his pack (see the salve note below) — the receipt counts on four
  // berries in hand, so top the pouch back up first.
  {
    const have = c.latest('inv')?.slots.find((x: any) => x && x.item === 'berries')?.qty ?? 0;
    if (have < 4) {
      mark = c.mark();
      await say(c, `/give berries ${4 - have}`);
      await c.waitFor((m) => m.t === 'inv', 'berries back in the pouch', 5000, mark);
    }
  }
  // THE QUIET HEEL: the mirror carries the bond clock so the client
  // can keep the world prompt quiet — open (0) before the claim,
  // closed (the full 240) on the send the claim itself triggers.
  const openSec = c.latest('pet')?.pets.find((p: any) => p.state === 'heel')?.bondSec;
  receipt('THE QUIET HEEL: the open clock reads zero on the mirror', openSec === 0, `bondSec ${openSec}`);
  await walkTo(downedEid!, 1.8);
  mark = c.mark();
  c.send({ t: 'interactnpc', eid: downedEid! });
  await c.waitFor((m) => m.t === 'chat' && /takes the berries gently/.test(m.text ?? ''), 'the bond moment', 5000, mark);
  const bondInv = await c.waitFor((m) => m.t === 'inv', 'the lure spent', 5000, mark);
  const berriesNow = bondInv.slots.find((x: any) => x && x.item === 'berries')?.qty ?? 0;
  receipt('KINDNESS PAYS: the bond moment feeds, heals, and teaches', berriesNow === 3, `berries ${berriesNow}`);
  const bondPet = await c.waitFor(
    (m) => m.t === 'pet' && m.pets.some((p: any) => p.state === 'heel' && (p.bondSec ?? 0) > 200),
    'the closed clock rides the mirror',
    5000,
    mark,
  );
  const closedSec = bondPet.pets.find((p: any) => p.state === 'heel')?.bondSec ?? 0;
  receipt('THE QUIET HEEL: the claim closes the clock on the wire', closedSec > 200 && closedSec <= 240, `bondSec ${closedSec}`);
  mark = c.mark();
  c.send({ t: 'interactnpc', eid: downedEid! });
  await c.waitFor((m) => m.t === 'chat' && /leans into your hand/.test(m.text ?? ''), 'the pat', 5000, mark);
  receipt('the snack clock holds: the second offer is only a hand', true);

  // ==== THE SPECIES SPEAK (Phase 5) ======================================

  // THE SALVE: the brewer sells to hunters — the same kneel, nearly
  // whole, and the jar is spent.
  mark = c.mark();
  await say(c, '/give mending_salve 1');
  await c.waitFor((m) => m.t === 'inv', 'salve in pack', 5000, mark);
  await downThePet([course[0] + 32, course[1] + 6]);
  // The staging can cost the keeper his life and his pack with it
  // (live-caught: the restage tended PLAIN because the jar died with
  // him) — make sure the jar is in the pack before the kneel.
  if (!c.latest('inv')?.slots.some((x: any) => x && x.item === 'mending_salve')) {
    mark = c.mark();
    await say(c, '/give mending_salve 1');
    await c.waitFor((m) => m.t === 'inv', 'salve back in pack', 5000, mark);
  }
  const salveDowned = livePet();
  await guardTheVigil(salveDowned!);
  await tendAt(salveDowned!, /salve does its quiet work/, 'salve');
  await sleep(500);
  {
    const risen2 = c.ents.get(salveDowned!);
    receipt(
      'THE SALVE: the same kneel, nearly whole, the jar spent',
      risen2 !== undefined && risen2.hpPct > 180 && risen2.hpPct < 235,
      `hpPct ${risen2?.hpPct}`,
    );
  }

  // THE KIT RIDES THE BITE: a wolf's worry leaves a wound that keeps
  // bleeding — the status byte on the mark says so while the keeper
  // stands idle.
  mark = c.mark();
  await say(c, '/tame wolf');
  await c.waitFor((m) => m.t === 'pet' && m.pets?.length === 2, 'the wolf joins', 5000, mark);
  const wolfSlot = c.latest('pet')!.pets.find((p: Msg) => p.state === 'heel')!.slot;
  // A bear, not a goblin: the wolf fells small marks before the wire
  // can even show the wound (live-caught) — the worry needs a neck
  // thick enough to keep bleeding on camera.
  // The bite is a lottery twice over (orbit variance, then the proc
  // roll), so the watch re-points every 12s and a beast that dies or
  // stalls out unbitten earns one fresh staging before the receipt
  // judges (live-caught: a single 50s watch still flaked).
  let bitten = false;
  for (let round = 0; round < 2 && !bitten; round++) {
    const kitMark = await stageFight('bear', round === 0 ? 'the kit bear' : 'the kit bear (second beast)');
    const t0 = Date.now();
    let rePoints = 0;
    while (Date.now() - t0 < 50000) {
      c.frame(0);
      const gsmp = c.ents.get(kitMark);
      if (!gsmp || gsmp.hpPct === 0) break;
      if (gsmp.status !== 0) {
        bitten = true;
        break;
      }
      // A slow first bite: another keeper blow shakes the fight
      // loose and re-points the wolf.
      if (rePoints < 3 && Date.now() - t0 > (rePoints + 1) * 12000) {
        rePoints++;
        await landOne(kitMark, 'the kit bear (re-point)');
      }
      await sleep(150);
    }
    await killTarget(kitMark, 'the kit bear');
  }
  receipt('THE KIT RIDES THE BITE: the worry keeps bleeding on the wire', bitten);
  await say(c, `/tame drop ${wolfSlot}`);
  await c.waitFor((m) => m.t === 'pet' && m.pets?.length === 1, 'the wolf returned (dev)', 5000);
  await say(c, '/tame heel 0');
  await c.waitFor(
    (m) => m.t === 'pet' && m.pets?.some((p: Msg) => p.slot === 0 && (p.state === 'heel' || p.state === 'trailing')),
    'the beetle takes the heel again',
    5000,
  );

  // THE KEEPER FLED exit: down it again, then walk out of its world.
  await downThePet([course[0] + 38, course[1] + 24]);
  mark = c.mark();
  await tpFarFrom(c, course);
  await c.waitFor((m) => m.t === 'chat' && /drags itself off toward your stalls/.test(m.text ?? ''), 'the limp home', 9000, mark);
  const restMirror = await c.waitFor(
    (m) => m.t === 'pet' && m.pets?.some((p: Msg) => p.state === 'resting' && (p.restSec ?? 0) > 0),
    'the mirror says resting, clock running',
    6000,
    mark,
  );
  receipt(
    'left behind, the friend limps home: resting, clock honest on the wire',
    restMirror.pets.some((p: Msg) => p.state === 'resting' && (p.restSec ?? 0) > 0),
  );

  // THE RESTED RISE: stand calm; it finds you when it is well. Wait
  // on PROVEN ground — the far county tpFarFrom picked may offer the
  // spawn no footing beside the keeper, and a rise that cannot place
  // a body waits forever (live-caught: 160s of calm on bad ground).
  // The resting row is already proven; where we wait is our choice.
  await tp(c, course[0] + 12, course[1] + 12);
  mark = c.mark();
  {
    const t0 = Date.now();
    for (;;) {
      if (c.msgs.slice(mark).some((m) => m.t === 'chat' && /returns to your side, rested and whole/.test(m.text ?? ''))) break;
      if (Date.now() - t0 > 190000) throw new Error('timeout waiting for the rested rise');
      c.frame(0);
      await sleep(300);
    }
  }
  {
    const t0 = Date.now();
    let whole = false;
    while (Date.now() - t0 < 8000) {
      c.frame(0);
      const lp = livePet();
      const smp = lp !== null ? c.ents.get(lp) : null;
      if (smp && smp.hpPct === 255) {
        whole = true;
        break;
      }
      await sleep(200);
    }
    receipt('the rested rise: it returns on its own, whole, at heel', whole);
  }

  // ==== THE THREE STALLS (Phase 4) =======================================

  // The stable door refuses at a distance, aloud.
  mark = c.mark();
  c.send({ t: 'stable', op: 'stable', slot: 0 });
  await c.waitFor(
    (m) => m.t === 'chat' && /The stalls are elsewhere/.test(m.text ?? ''),
    'far refusal',
    5000,
    mark,
  );
  receipt('the stable door refuses at a distance, aloud', true);

  // The authored Dawnmead pen: the level-10 town keeps the first one.
  await tp(c, -47, 41);
  await sleep(800);
  mark = c.mark();
  c.send({ t: 'stable', op: 'stable', slot: 0 });
  await c.waitFor((m) => m.t === 'chat' && /settles into the stall/.test(m.text ?? ''), 'the rest', 5000, mark);
  await c.waitFor(
    (m) => m.t === 'pet' && m.pets?.some((p: Msg) => p.slot === 0 && p.state === 'stabled'),
    'mirror says stabled',
    5000,
    mark,
  );
  // Outwait the sample-freshness window — the body is gone the moment
  // the mirror says so; the snapshot ghost takes 1.5s to age out.
  await sleep(2200);
  receipt('REST IN THE STALL: the heel friend settles, its body withdrawn', livePet() === null);
  mark = c.mark();
  c.send({ t: 'stable', op: 'heel', slot: 0 });
  await c.waitFor((m) => m.t === 'chat' && /comes to your side/.test(m.text ?? ''), 'the call', 5000, mark);
  {
    const t0 = Date.now();
    let back = false;
    while (Date.now() - t0 < 6000) {
      c.frame(0);
      if (livePet() !== null) {
        back = true;
        break;
      }
      await sleep(150);
    }
    receipt('TAKE TO HEEL: the stall opens and the friend stands up', back);
  }

  // The keeper of the stalls has a voice (and opinions).
  const marenEid = c.msgs
    .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
    .find((e: Msg) => e.actor === 'drover_maren')?.eid;
  receipt('Maren keeps the Dawnmead stalls', marenEid !== undefined);
  {
    const b2 = c.ents.get(marenEid);
    if (b2 && c.pos && Math.hypot(b2.x - c.pos.x, b2.y - c.pos.y) > 2) {
      await walkTo(marenEid, 1.6);
    }
    mark = c.mark();
    c.send({ t: 'interactnpc', eid: marenEid });
    const dlg = await c.waitFor((m) => m.t === 'dlgopen', 'Maren speaks', 6000, mark);
    receipt('the drover answers in her own voice', dlg.name === 'Maren');
    c.send({ t: 'dlgend' });
    await sleep(400);
  }

  // ==== THE LONG ROAD TOGETHER (Phase 6) =================================

  // THE SADDLE AND THE HEEL: the courser outruns every species — the
  // friend slips honestly to trailing on the ride and the dismount
  // calls it back. Two systems, no shared law, no collision. Open
  // country first: a gallop into the Dawnmead river never breaks 24
  // tiles (live-caught).
  mark = c.mark();
  await say(c, '/mount courser_bay');
  await c.waitFor((m) => m.t === 'ride' && m.mount === 'courser_bay', 'saddled', 5000, mark);
  {
    // The check rides IN the saddle: stopping first lets the calm
    // counter stand the friend back up before the assert (a race
    // lost twice). Trailing must be observed mid-gallop.
    // The probe proved the mechanism sound (the beetle gives up
    // 3.8 t/s and falls to trailing ~6.3s into a clean gallop); what
    // fails in the wild is the GROUND — the ~70-tile clean lane the
    // shed needs is a lottery near any one start (live-caught three
    // times). So: sweep spread-out candidate runways (the mounts
    // harness pattern), remount on any bite, and judge by wire truth —
    // the friend's snapshot going stale mid-gallop — never by keeper
    // displacement.
    const jit2 = Number(STAMP) % 13;
    const RUNWAYS: Array<[number, number]> = [
      [200 + jit2, 60],
      [240, 100 + jit2],
      [160, 130],
      [280 + jit2, 90],
      [220, 140 + jit2],
      [180, 90],
    ];
    let trailedMidRide = false;
    const rideLog: string[] = [];
    // The current pet body is the newest owned eid: every trailing
    // return mints a fresh entity, and server eids are monotonic.
    const pet0 = () => Math.max(...c.petEids(c.eid));
    for (let cast = 0; cast < RUNWAYS.length && !trailedMidRide; cast++) {
      const [hx, hy] = cast % 2 ? [0, 1] : [1, 0];
      await tp(c, RUNWAYS[cast]![0], RUNWAYS[cast]![1]);
      await sleep(900);
      const castT0 = Date.now();
      const start = { x: c.pos!.x, y: c.pos!.y };
      // The staleness clock only runs during CONTIGUOUS clean gallop —
      // pinned or slow ground lets the friend legally hold the 24-tile
      // leash forever (live-caught: 66 tiles at 4 t/s average shed
      // nothing). The gate sits between foot speed (~4.2 t/s) and the
      // courser's ~8.0 t/s: 8 itself never armed (live-caught again).
      const trace: Array<{ t: number; x: number; y: number }> = [];
      let cleanSince: number | null = null;
      let maxGap = 0;
      let cleanBest = 0;
      while (Date.now() - castT0 < 22000 && !trailedMidRide) {
        c.frame(0, hx, hy);
        const now = Date.now();
        const saddle = c.latest('ride');
        if (!saddle?.mount) {
          // A wild bite broke the saddle: climb back up; the gallop
          // clock restarts on its own (dismount reads as slow ground).
          rideLog.push(`cast ${cast}: bitten off the saddle at +${now - castT0}ms`);
          mark = c.mark();
          await say(c, '/mount courser_bay');
          await c.waitFor((m) => m.t === 'ride' && m.mount === 'courser_bay', 'resaddled', 5000, mark);
          cleanSince = null;
          continue;
        }
        trace.push({ t: now, x: c.pos!.x, y: c.pos!.y });
        while (trace.length && trace[0]!.t < now - 1100) trace.shift();
        const w0 = trace[0]!;
        const dt = (now - w0.t) / 1000;
        const speed = dt > 0.5 ? Math.hypot(c.pos!.x - w0.x, c.pos!.y - w0.y) / dt : 0;
        if (speed > 6) cleanSince ??= now;
        else cleanSince = null;
        if (cleanSince !== null) cleanBest = Math.max(cleanBest, now - cleanSince);
        const s = c.ents.get(pet0());
        if (s && now - s.at < 1500) {
          maxGap = Math.max(maxGap, Math.hypot(c.pos!.x - s.x, c.pos!.y - s.y));
        }
        if (cleanSince !== null && now - cleanSince > 5000) {
          // Past 5s of unbroken gallop, a truly-trailing friend has no
          // body on the wire: its sample ages past 2.5s.
          if (!s || now - s.at > 2500) trailedMidRide = true;
        }
        // Pinned heading: rotate early instead of grinding the clock.
        if (now - castT0 > 5000 && Math.hypot(c.pos!.x - start.x, c.pos!.y - start.y) < 8) break;
        await sleep(50);
      }
      if (!trailedMidRide) {
        const d = Math.hypot(c.pos!.x - start.x, c.pos!.y - start.y);
        rideLog.push(
          `cast ${cast}: heading ${hx},${hy} ran ${d.toFixed(1)} tiles, clean gallop best ${(cleanBest / 1000).toFixed(1)}s, max gap ${maxGap.toFixed(1)}, never shed the heel`,
        );
      }
    }
    c.frame(0);
    if (!trailedMidRide) for (const l of rideLog) console.log(`  RIDE DEBUG ${l}`);
    receipt('THE ROAD OUTRUNS THE HEEL: trailing at courser speed', trailedMidRide);
  }
  await say(c, '/mount off');
  {
    const t0 = Date.now();
    let back = false;
    while (Date.now() - t0 < 9000) {
      c.frame(0);
      if (livePet() !== null) {
        back = true;
        break;
      }
      await sleep(150);
    }
    receipt('the dismount calls the friend back', back);
  }

  // THE QUIET SHADOW, lived: the companion stands nearly nose to
  // nose with an idle goblin and is never seen — perception belongs
  // to players alone.
  // The spawn ring drops the goblin at arm's length and arm's length
  // is instant aggro for the KEEPER (live-caught twice) — so shed any
  // spawn-side grudge on the leash first (19 tiles: past the goblin's
  // 16, inside the pet's 24), let it settle home, then return to a
  // polite three tiles. What remains is the pure claim: the PET
  // stands nearer than the keeper and is never seen. Wild country
  // still fouls a staging (a roaming herd mauls the keeper, DEFEND
  // fires, the goblin rightly chases the biter — live-caught after
  // the runway sweep moved the dismount into open plains), so: up to
  // three stagings on spread ground back in the swept course band.
  // THE JUDGMENT IS THE EYE, NOT THE MANNERS: a keeper cannot stand
  // three tiles inside a 170 degree eye for six seconds without being
  // noticed, crouched or not — that is perception WORKING (five runs
  // of facing-lottery fouls said so). The claim under proof is that
  // the goblin's eye never lands on the PET standing nearer: the
  // judged line may name the keeper freely, but any reference to the
  // pet's eid is a leak — unless the keeper bled in the window (a
  // bitten keeper's companion defends, and being bitten legally
  // retargets a mob: law, not perception; that staging fouls).
  let shadowGoblin = -1;
  let shadowLine: Msg | null = null;
  let shadowPetRef = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    // A refused spot (water, rock, the tp lands nowhere) costs this
    // attempt, never the run — rotate to the next spread spot
    // (live-caught: tp to 300,97 never landed killed a 42-green run).
    try {
      await tp(c, course[0] + 20 + attempt * 17, course[1] + 33 + attempt * 9);
      await sleep(700);
      // The keeper crouches for the whole dance (Sneak = 1 << 7,
      // held): the claim under test is the PET standing in the open
      // unseen, and the KEEPER's visibility is pure staging noise —
      // the spawn ring drops the goblin at arm's length (instant
      // aggro on a standing keeper) and a 170-degree eye at three
      // tiles made the judgment a facing lottery (live-caught: all
      // three attempts fouled on alert@keeper).
      c.frame(128);
      await sleep(150);
      mark = c.mark();
      await say(c, '/spawnmob goblin 1');
      await c.waitFor(
        (m) => (m.t === 'enter' || m.t === 'update') && m.entities?.some((e: Msg) => e.defId === 'goblin' && e.ownerEid === undefined),
        'shadow goblin enters',
        6000,
        mark,
      );
      shadowGoblin = c.msgs
        .slice(mark)
        .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
        .find((e: Msg) => e.defId === 'goblin' && e.ownerEid === undefined).eid;
      const g0 = c.ents.get(shadowGoblin)!;
      await tp(c, Math.round(g0.x) + 19, Math.round(g0.y));
      await sleep(9000);
      await tp(c, Math.round(g0.x) + 3, Math.round(g0.y));
      await sleep(4600);
      const petNow = livePet();
      const hp0 = (c.eid !== null ? c.ents.get(c.eid)?.hpPct : undefined) ?? 255;
      mark = c.mark();
      await say(c, '/npcstate');
      shadowLine = await c.waitFor(
        (m) => m.t === 'chat' && new RegExp(`^goblin#${shadowGoblin} `).test(m.text ?? ''),
        'shadow goblin brain',
        6000,
        mark,
      );
      shadowPetRef =
        petNow !== null &&
        new RegExp(`(tgt=|@|helpEid=)${petNow}\\b`).test(shadowLine.text ?? '');
      if (!shadowPetRef) break; // clean: the eye never found the friend
      const bled = ((c.eid !== null ? c.ents.get(c.eid)?.hpPct : undefined) ?? 255) < hp0;
      if (!bled) break; // an unbitten goblin naming the pet is a REAL leak — judge it
      console.log(`  (shadow staging fouled, attempt ${attempt + 1}: keeper bled, the defend retargeted — restaging: ${shadowLine.text})`);
      await killTarget(shadowGoblin, 'the fouled shadow goblin');
    } catch (err) {
      console.log(`  (shadow staging attempt ${attempt + 1} broke: ${(err as Error).message} — restaging)`);
      if (shadowGoblin >= 0 && c.ents.has(shadowGoblin)) {
        try {
          await killTarget(shadowGoblin, 'the stranded shadow goblin');
        } catch {
          /* the next attempt stages fresh regardless */
        }
      }
    }
  }
  receipt(
    'THE QUIET SHADOW, lived: the goblin never sees the friend beside it',
    shadowLine !== null && !shadowPetRef,
    shadowLine?.text,
  );
  c.frame(0); // stand back up out of the crouch
  await killTarget(shadowGoblin, 'the shadow goblin');

  // THE ROAD SOAK: every authored pen answers — the caravanserai bay
  // at Silverfall and the Pinewatch muster yard, the whole map apart.
  for (const [px, py, label] of [
    [-323, -120, 'Silverfall'],
    [595, -133, 'Pinewatch'],
  ] as Array<[number, number, string]>) {
    await tp(c, px, py);
    await sleep(900);
    mark = c.mark();
    c.send({ t: 'stable', op: 'stable', slot: 0 });
    await c.waitFor((m) => m.t === 'chat' && /settles into the stall/.test(m.text ?? ''), `${label} rest`, 6000, mark);
    mark = c.mark();
    c.send({ t: 'stable', op: 'heel', slot: 0 });
    await c.waitFor((m) => m.t === 'chat' && /comes to your side/.test(m.text ?? ''), `${label} heel`, 6000, mark);
    receipt(`the road soak: the ${label} pen answers, the whole map from home`, true);
  }

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

  // THE RELEASE: a collar slipped at the stalls, and room again.
  mark = c.mark();
  const heelSlot = c.latest('pet')!.pets.find((p: Msg) => p.state === 'heel' || p.state === 'trailing')!.slot;
  c.send({ t: 'stable', op: 'release', slot: heelSlot });
  await c.waitFor((m) => m.t === 'chat' && /the wild takes it home/.test(m.text ?? ''), 'the goodbye', 5000, mark);
  await c.waitFor((m) => m.t === 'pet' && m.pets?.length === 2, 'a stall stands empty', 5000, mark);
  receipt('THE RELEASE: the collar slips, the household honestly smaller', true);
  mark = c.mark();
  await say(c, '/tame rat');
  await c.waitFor((m) => m.t === 'pet' && m.pets?.length === 3, 'the stall refills', 5000, mark);

  // Leave town before the bears come out — the force-quit stage is
  // wild business, not Dawnmead's.
  await tpFarFrom(c, course);
  await sleep(600);

  // --- THE FORCE-QUIT: down the fresh heel friend (the rat), then
  // slam the window shut mid-vigil. The grace runs out with nobody
  // home, and the row must land 'resting' — a force-quit on the
  // downed screen loses NOTHING, and the rest clock survives the
  // logout because it is wall-clock in the row.
  await topUp();
  await downThePet([Math.round(c.pos!.x) + 6, Math.round(c.pos!.y)]);
  c.ws.close();
  console.log('  (force-quit mid-vigil; waiting out the reconnect grace...)');
  await sleep(36000);

  const c2 = new Client();
  await c2.open();
  c2.send({ t: 'hello', v: PROTOCOL_VERSION });
  c2.send({ t: 'login', user: USER, pass: 'proving123' });
  const w2 = await c2.waitFor((m) => m.t === 'welcome', 'relogin welcome', 9000);
  c2.eid = w2.eid;
  const mirror2 = await c2.waitFor((m) => m.t === 'pet' && (m.pets?.length ?? 0) > 0, 'relogin mirror', 7000);
  const bramble = mirror2.pets.find((p: Msg) => p.name === 'Bramble');
  const ratRow = mirror2.pets.find((p: Msg) => p.species === 'rat' && p.state === 'resting');
  receipt(
    'the force-quit loses nothing: the downed friend lands resting, clock kept',
    ratRow !== undefined && (ratRow.restSec ?? 0) > 0,
    `restSec ${ratRow?.restSec}`,
  );
  receipt(
    'the household survives the night: three stalls, the name kept',
    mirror2.pets.length === 3 && bramble?.species === 'giant_beetle',
  );

  console.log(`\nTHE OPEN HAND, THE FANG, THE FALL, THE STALLS, AND THE SPECIES ALL HOLD — ${passed} receipts.`);
  c2.ws.close();
  process.exit(0);
};

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
