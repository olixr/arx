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
  const beetleMeta = c.msgs
    .flatMap((m) => (m.t === 'enter' || m.t === 'update' ? (m.entities ?? []) : []))
    .find((e: Msg) => e.defId === 'giant_beetle');
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
    for (;;) {
      if (Date.now() - t0 > 15000) {
        const b = c.ents.get(targetEid);
        const me = c.pos;
        throw new Error(
          `could not reach entity ${targetEid} (d ${b && me ? Math.hypot(b.x - me.x, b.y - me.y).toFixed(1) : '?'})`,
        );
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

  // --- Refusal 1: the rung. Beastcraft 1 asks and is told, aloud.
  await walkTo(beetle);
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
  await walkTo(beetle);
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
      if (Date.now() - t0 > 60000) {
        const b = c.ents.get(beetle);
        const me = c.pos;
        const hits = c.msgs.filter((m) => m.t === 'hit' && m.eid === beetle).length;
        const anyHits = c.msgs.filter((m) => m.t === 'hit').length;
        throw new Error(
          `could not wear the beetle down in 60s (hpPct ${b?.hpPct}, d ${b && me ? Math.hypot(b.x - me.x, b.y - me.y).toFixed(2) : '?'}, hits-on-beetle ${hits}, hits-any ${anyHits})`,
        );
      }
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
  await walkTo(beetle);
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
  await say(c, '/give berries 5');
  await walkTo(beetle);
  mark = c.mark();
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
  await walkTo(beetle);
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
  /** Spawn a mob and open on it, retrying whole bodies on stage flakes. */
  const stageFight = async (species: string, label: string): Promise<number> => {
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
          .find((e: Msg) => e.defId === species).eid;
        await sleep(300);
        await landOne(eid2, label);
        return eid2;
      } catch (err) {
        if (attempt === 3) throw err;
        console.log(`  (stage flake on ${label}, attempt ${attempt}: ${String((err as Error).message)} — respawning)`);
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
  mark = c.mark();
  await say(c, '/npcstate');
  await c.waitFor(
    (m) => m.t === 'chat' && new RegExp(`^goblin#${goblinEid} .*tgt=${petNow}\\b`).test(m.text ?? ''),
    'goblin brain shows the pet as its mark',
    6000,
    mark,
  );
  receipt('THE HARRY: the companion holds the eye', true);
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
  receipt(
    'THE FIRST EYE HOLDS: the keeper shoots free, the mob stays on the pet',
    new RegExp(`tgt=${petNow}\\b`).test(still.text ?? '') || /hp=0/.test(still.text ?? ''),
    still.text,
  );
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

  // THE FALL IS SURVIVED (the Phase 3 ceremony will replace this):
  // a bear is too much beetle for a beetle. Top the keeper up first —
  // /xp raises the ceiling, never the fill (live-caught: a half-full
  // keeper died to the maul before the pet's fall could land).
  mark = c.mark();
  await say(c, '/give healing_tincture 12');
  await c.waitFor((m) => m.t === 'inv', 'tinctures in pack', 5000, mark);
  for (let i = 0; i < 14; i++) {
    if ((c.pos?.hpPct ?? 0) >= 250) break;
    const invNow = c.latest('inv');
    const tSlot = invNow!.slots.findIndex((x: any) => x && x.item === 'healing_tincture');
    if (tSlot < 0) break;
    c.send({ t: 'use', slot: tSlot });
    await sleep(350);
  }
  // The mark opens BEFORE the staging: a bear can fell a beetle in
  // the very first exchange, mid-stage (live-caught — the fall line
  // arrived before a later mark and the wait starved on history).
  const bearMark = c.mark();
  await stageFight('bear', 'the bear');
  // Step back out of the maul: the bear chases, the companion cuts it
  // off, and the receipt watches the fall from a survivable distance.
  const backT0 = Date.now();
  while (Date.now() - backT0 < 1300) {
    c.frame(0, -1, 0.3);
    await sleep(50);
  }
  c.frame(0);
  mark = bearMark;
  try {
    const fallT0 = Date.now();
    let probed = 0;
    for (;;) {
      if (c.msgs.slice(mark).some((m) => m.t === 'chat' && /lick its wounds/.test(m.text ?? ''))) break;
      if (Date.now() - fallT0 > 60000) throw new Error('timeout waiting for the fall line');
      if (Date.now() - fallT0 > probed * 6000) {
        probed++;
        c.send({ t: 'chat', text: '/petstate' });
      }
      await sleep(200);
    }
  } catch (e) {
    // The post-mortem lens: what was everyone doing when it hung?
    await say(c, '/npcstate');
    await sleep(1200);
    const chats = c.msgs.filter((m) => m.t === 'chat').slice(-14).map((m) => m.text);
    const pm = c.latest('pet');
    console.error('FALL DEBUG chats:', JSON.stringify(chats, null, 1));
    console.error('FALL DEBUG mirror:', JSON.stringify(pm?.pets));
    console.error('FALL DEBUG pet sample:', JSON.stringify(c.ents.get(livePet() ?? -1)));
    throw e;
  }
  const restMirror = await c.waitFor(
    (m) => m.t === 'pet' && m.pets?.some((p: Msg) => p.state === 'resting'),
    'the mirror says resting',
    6000,
    mark,
  );
  receipt(
    'THE FALL IS NEVER THE END, interim: the friend breaks off, resting, never lost',
    restMirror.pets.some((p: Msg) => p.state === 'resting'),
  );
  // Shed the bear, then prove the rest holds the door shut.
  await tp(c, course[0] - 60, course[1] - 40);
  const restT0 = Date.now();
  while (Date.now() - restT0 < 3000) {
    c.frame(0);
    await sleep(150);
  }
  receipt('the rest holds: no body returns before its hour', livePet() === null);

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

  console.log(`\nTHE OPEN HAND AND THE FANG BOTH HOLD — ${passed} receipts.`);
  c2.ws.close();
  process.exit(0);
};

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
