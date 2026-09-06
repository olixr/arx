/**
 * Course-dialect laws (band 9a, THE MARL; band 9c, THE REMAINING
 * BODIES): every dolmen NPC id owns its stratum's design (no reskin
 * fallback), the Marl's hide is BONE — warm, not the moon's blue-white
 * — the Sinter's is grey-blue and never violet, the Gossan's rust is
 * never gold, no hide is any golem's stone, a hob's or a skral's; the
 * whole dialect paints clean across all eight facing bands for every
 * look; the face never shows from behind and keeps both eyes at the
 * three-quarters; headless-from-behind reads as a HOOD (the back plate
 * rises 0.05s over the crown) on every yoke shape; THE SHADE FLOOR
 * holds from behind on every look; the beads and the ticks show from
 * the north; THE STONE FACE ignores the gape; THE LEVEL GAIT's dial
 * lands at BOTH hip sites through one helper; the plumb's sim settles
 * to THE ONE REST; THE CLUSTER IS THE STRATUM (a ±6 jitter on the
 * pooled ids, never on a design); the slug seam pins a named face; the
 * corpse paints the head inside its collar with a slack plumb; and the
 * hand-synced mirrors agree on the ids and the numbers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { NPCS } from '@arx/content';
import {
  DOLMEN_BOB,
  DOLMEN_DESIGNS,
  DOLMEN_HEAD_DEBUG,
  DOLMEN_LOOKS,
  NOTCH_THETA,
  bobForm,
  dolmenHeadHull,
  dolmenLook,
  dolmenPlumbFront,
  dolmenPlumbRoot,
  dolmenRimFixtures,
  dolmenYoke,
  dolmenYokeRim,
  PLUMB_FRONT_OFF,
  PLUMB_FRONT_ON,
  drawDolmenArm,
  drawDolmenPlumb,
  drawDolmenPlumbSlack,
  paintDolmenBody,
  paintDolmenFoot,
  paintDolmenHead,
  type DolmenLook,
} from './dolmen.js';
import { walkBobK, type RigPose } from './rig.js';
import { shade } from './tint.js';
import { GOLEM_LOOKS } from './golems.js';
import { HOB_LOOKS } from './hobgoblin.js';
import { SKRAL_LOOKS } from './skral.js';
import { PendantSim, pendantRest } from './ogre.js';
import { humanoidMonsterSize, isHumanoidMonster } from './npcRoster.js';
import {
  HUMANOID_FEET,
  HUMANOID_UPPER,
  type Ragdoll,
  buildHumanoidRagdoll,
  dolmenFallenRimStations,
  drawHumanoidRagdoll,
  type HumanoidCorpseLook,
} from './ragdoll.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The five ids, roster order (the Marl first). */
const IDS = ['dolmen', 'dolmen_sinter', 'dolmen_culm', 'dolmen_gossan', 'dolmen_champion'] as const;
/** The stature ladder every mirror must carry, in this order. */
const STATURE: Record<(typeof IDS)[number], number> = {
  dolmen: 1.02,
  dolmen_sinter: 1.1,
  dolmen_culm: 1.04,
  dolmen_gossan: 1.16,
  dolmen_champion: 1.3,
};

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 0xff, n & 0xff];
};
/** THE SHADE FLOOR (the gnoll rule): a fill's first hex digit ≥ 3. */
const clearsFloor = (hex: string): boolean => !/^#[0-2]/.test(hex);

test('every dolmen NPC id resolves to its own authored look', (t) => {
  const ids = [...NPCS.keys()].filter((id) => id.startsWith('dolmen'));
  if (ids.length === 0) {
    // L2 lands the NpcDef rows; L3 re-runs this pin with them present.
    t.diagnostic('no dolmen NpcDef registered yet — the roster pin waits for L2');
  } else {
    assert.deepEqual(ids, [...IDS], 'the five ids, the Marl first');
    for (const id of ids) assert.ok(DOLMEN_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  assert.deepEqual(Object.keys(DOLMEN_LOOKS), [...IDS]);
  // Unknown future ids degrade to the Marl (a fallback DESIGN, never jittered), never crash.
  assert.equal(dolmenLook('dolmen_new_thing', 7).hide, DOLMEN_LOOKS['dolmen']!.hide);
  assert.equal(dolmenLook('dolmen', 8), dolmenLook('dolmen', 8), 'a body keeps its look frame to frame');
  assert.equal(dolmenLook('dolmen', 8).seed, 8);
  assert.equal(DOLMEN_LOOKS['dolmen']!.stratum, 'marl');
  assert.equal(DOLMEN_LOOKS['dolmen_sinter']!.stratum, 'sinter');
  assert.equal(DOLMEN_LOOKS['dolmen_culm']!.stratum, 'culm');
  assert.equal(DOLMEN_LOOKS['dolmen_gossan']!.stratum, 'gossan');
  assert.equal(DOLMEN_LOOKS['dolmen_champion']!.stratum, 'gossan', 'the champion is a Gossan');
});

test('the stature chain: renderer DOLMEN_SIZE (the Marl first), gameRender MOB_SIZE, lab SIZE, the 3D rung', () => {
  const rr = readFileSync(resolve(HERE, 'renderer.ts'), 'utf8');
  const block = rr.match(/DOLMEN_SIZE: Record<string, number> = \{([\s\S]*?)\};/);
  assert.ok(block, 'renderer DOLMEN_SIZE block');
  const body = block![1]!.replace(/\/\/[^\n]*/g, '');
  const pairs = [...body.matchAll(/(\w+):\s*([\d.]+)/g)].map((m) => [m[1]!, parseFloat(m[2]!)] as const);
  assert.deepEqual(
    pairs.map((p) => p[0]),
    [...IDS],
    'the five ids in roster order, the Marl first',
  );
  for (const [id, v] of pairs) assert.equal(v, STATURE[id as (typeof IDS)[number]], `renderer ${id}`);
  const gr = readFileSync(resolve(HERE, '..', 'cms', 'gameRender.ts'), 'utf8');
  const lab = readFileSync(resolve(HERE, '..', 'dev', 'dolmenlab.ts'), 'utf8');
  for (const id of IDS) {
    const re = new RegExp(`^\\s*${id}:\\s*([\\d.]+),\\s*$`, 'm');
    const gm = gr.match(re);
    assert.ok(gm, `gameRender MOB_SIZE carries ${id}`);
    assert.equal(parseFloat(gm![1]!), STATURE[id], `card ${id}`);
    const lm = lab.match(re);
    assert.ok(lm, `dolmenlab SIZE carries ${id}`);
    assert.equal(parseFloat(lm![1]!), STATURE[id], `lab ${id}`);
    assert.ok(STATURE[id] < 1.5, `${id} stays under the giant-gait line`);
    assert.ok(isHumanoidMonster(id));
    assert.equal(humanoidMonsterSize(id), 1.0, `${id}: the 3D rung is a grey man`);
  }
});

test('the colour mirror: every NpcDef color is its look\'s hide', (t) => {
  let seen = 0;
  for (const id of IDS) {
    const def = NPCS.get(id);
    if (!def) continue;
    seen++;
    assert.equal(def.color, DOLMEN_LOOKS[id]!.hide, `${id}: the content row and the look read one hex`);
  }
  if (seen < IDS.length) t.diagnostic(`${IDS.length - seen} dolmen NpcDef rows absent — the mirror pin waits for L2`);
});

test('the card is the design: seed 0 is the authored palette exactly, for every look', () => {
  for (const id of IDS) {
    const card = dolmenLook(id, 0);
    assert.equal(card.hide, DOLMEN_LOOKS[id]!.hide, `${id} hide`);
    assert.equal(card.yoke, DOLMEN_LOOKS[id]!.yoke, `${id} yoke`);
  }
});

test('THE CLUSTER IS THE STRATUM: a ±6 shade jitter on the pooled ids, never a palette swap, never on a design', () => {
  const marl = DOLMEN_LOOKS['dolmen']!;
  const [hr0, hg0, hb0] = rgb(marl.hide);
  const [yr0] = rgb(marl.yoke);
  let moved = 0;
  for (let seed = 1; seed <= 64; seed++) {
    const lk = dolmenLook('dolmen', seed);
    const [r, g, b] = rgb(lk.hide);
    assert.ok(Math.abs(r - hr0) <= 6 && Math.abs(g - hg0) <= 6 && Math.abs(b - hb0) <= 6, `seed ${seed} stays within the band`);
    assert.ok(r >= g && g >= b && r - b >= 0x14, `seed ${seed} stays BONE`);
    const [yr] = rgb(lk.yoke);
    assert.equal(yr - yr0, r - hr0, `seed ${seed}: the plate shifts with the hide`);
    if (r !== hr0) moved++;
  }
  assert.ok(moved > 0, 'a sett of ten is not ten stamps');
  const sin = DOLMEN_LOOKS['dolmen_sinter']!;
  for (let seed = 1; seed <= 64; seed++) {
    const [r, g, b] = rgb(dolmenLook('dolmen_sinter', seed).hide);
    assert.ok(r <= g && g <= b + 2, `sinter seed ${seed} stays grey-blue`);
    assert.ok(b - r >= 0x06 && b - r <= 0x18, `sinter seed ${seed} never violet, never the moon`);
  }
  assert.equal(rgb(sin.hide).join(), rgb(dolmenLook('dolmen_sinter', 0).hide).join());
  const vorl = dolmenLook('dolmen_champion', 37);
  assert.equal(vorl.hide, DOLMEN_LOOKS['dolmen_champion']!.hide, 'the champion is a pure design');
  assert.equal(vorl.yoke, DOLMEN_LOOKS['dolmen_champion']!.yoke);
});

test('THE SLUG SEAM (Fix B): a named throat keeps one face; the pooled slugs keep rolling', () => {
  const ammat = dolmenLook('dolmen', 9, 'dolmen_ammat');
  assert.equal(ammat.seed, DOLMEN_DESIGNS['dolmen_ammat']!.seed);
  assert.equal(ammat.hide, DOLMEN_LOOKS['dolmen']!.hide, 'a design takes no jitter');
  assert.equal(dolmenLook('dolmen', 9, 'dolmen_setter').seed, 9, 'a pooled slug rolls by eid');
  assert.equal(dolmenLook('dolmen', 9).seed, 9);
  assert.equal(dolmenLook('dolmen_champion', 5, 'dolmen_vorl').seed, 7);
  assert.equal(dolmenLook('dolmen', 9, 'dolmen_ammat'), dolmenLook('dolmen', 200, 'dolmen_ammat'), 'one face across boots');
  assert.equal(dolmenLook('dolmen', 9, 'dolmen_setter'), dolmenLook('dolmen', 9, 'dolmen_setter'), 'cached per triple');
  assert.deepEqual(Object.keys(DOLMEN_DESIGNS).sort(), ['dolmen_ammat', 'dolmen_drusa', 'dolmen_durrow', 'dolmen_sarsen', 'dolmen_vorl']);
});

test('BONE, NOT MOON, NOT STONE: the Marl warm, the Sinter cool, the Gossan never gold, the floor held, no hide shared', () => {
  const marl = DOLMEN_LOOKS['dolmen']!.hide;
  {
    const [r, g, b] = rgb(marl);
    assert.ok(r >= g && g >= b, 'a yellow-grey cast, never blue');
    assert.ok(r - b >= 0x14, 'warm by a clear margin, never moonpale');
  }
  {
    const [r, g, b] = rgb(DOLMEN_LOOKS['dolmen_sinter']!.hide);
    assert.ok(r <= g && g <= b + 2, 'the Sinter is grey-blue');
    assert.ok(b - r >= 0x06 && b - r <= 0x18, 'never violet, never the moon');
  }
  for (const id of ['dolmen_gossan', 'dolmen_champion'] as const) {
    const [r, g, b] = rgb(DOLMEN_LOOKS[id]!.hide);
    assert.ok(r - g >= g - b, `${id}: red-leaning rust, never yellow`);
    assert.ok(r <= 0xb0, `${id}: never bright, never gold`);
  }
  const others = new Set<string>([
    ...Object.values(GOLEM_LOOKS).map((g2) => g2.shell),
    ...Object.values(HOB_LOOKS).map((h) => h.hide),
    ...Object.values(SKRAL_LOOKS).map((s) => s.hide),
  ]);
  for (const id of IDS) {
    const lk = DOLMEN_LOOKS[id]!;
    assert.ok(!others.has(lk.hide), `${id} wears no golem stone, no hob brick, no skral water`);
    // THE SHADE FLOOR: the deepest shade of every fill that can show from behind.
    assert.ok(clearsFloor(shade(lk.yoke, -30)), `${id}: the inner face clears the floor`);
    assert.ok(clearsFloor(shade(lk.hide, -13)), `${id}: the shin clears the floor`);
    const [br, bg, bb] = rgb(lk.bob);
    if (Math.max(br, bg, bb) >= 0x60) assert.ok(clearsFloor(shade(lk.bob, -40)), `${id}: a pale bob's base clears the floor`);
  }
});

test('THE BEAD LAW: dull iron, never gold; the girdle is five and seven; no bead on the other strata', () => {
  for (const id of IDS) {
    const lk = DOLMEN_LOOKS[id]!;
    if (lk.rimKind === 'beads') {
      assert.ok(lk.bead, `${id} names its bead`);
      const [r, , b] = rgb(lk.bead!);
      assert.ok(b >= r - 8, `${id}: no warm cast on iron`);
      assert.ok(Math.max(...rgb(lk.bead!)) <= 0x80, `${id}: dull, never bright`);
    } else {
      assert.equal(lk.girdle ?? 0, 0, `${id} wears no girdle`);
    }
  }
  assert.equal(DOLMEN_LOOKS['dolmen_gossan']!.girdle, 5);
  assert.equal(DOLMEN_LOOKS['dolmen_champion']!.girdle, 7);
  assert.equal(DOLMEN_LOOKS['dolmen_gossan']!.rimKind, 'beads');
  assert.equal(DOLMEN_LOOKS['dolmen_champion']!.rimKind, 'beads');
});

test('THE EYES: the Culm the only warm eye; the Sinter has its glint', () => {
  for (const id of IDS) {
    const [r, , b] = rgb(DOLMEN_LOOKS[id]!.eye);
    if (id === 'dolmen_culm') assert.ok(r - b >= 0x60, 'the ember tick');
    else assert.ok(r - b <= 0x20, `${id}: a pale or a wet dark tick`);
  }
  assert.ok(DOLMEN_LOOKS['dolmen_sinter']!.glint, 'a dark tick alone vanishes at 110');
  assert.equal(DOLMEN_LOOKS['dolmen_culm']!.seam, '#b5432e', 'the red-dust line');
});

test('HANDS ASCEND: the Marl carries no dial (the smallest by construction); the rest lift above 1', () => {
  assert.equal(DOLMEN_LOOKS['dolmen']!.hand, undefined);
  assert.equal(DOLMEN_LOOKS['dolmen']!.keel, undefined);
  assert.equal(DOLMEN_LOOKS['dolmen']!.stoop, undefined);
  assert.equal(DOLMEN_LOOKS['dolmen']!.yokeH, undefined);
  const hands = ['dolmen_culm', 'dolmen_sinter', 'dolmen_gossan', 'dolmen_champion'].map((id) => DOLMEN_LOOKS[id]!.hand!);
  assert.deepEqual(hands, [1.02, 1.04, 1.18, 1.28]);
  for (let i = 1; i < hands.length; i++) assert.ok(hands[i]! > hands[i - 1]!);
  assert.equal(DOLMEN_LOOKS['dolmen_sinter']!.stoop, 0.16, 'the Sinter is bent');
  assert.equal(DOLMEN_LOOKS['dolmen_sinter']!.yokeH, 0.35, 'the tallest hooded yoke');
  assert.equal(DOLMEN_LOOKS['dolmen_gossan']!.yokeH, undefined, 'the ridge is a line, not a height');
});

/** A recording 2D-context stand-in: counts fills by colour, rejects NaN coords. */
function mockCtx(ink: string): CanvasRenderingContext2D & {
  fills: number;
  inkFills: number;
  fillsOf: (col: string) => number;
  colours: () => string[];
} {
  const byCol = new Map<string, number>();
  const counter = {
    fills: 0,
    inkFills: 0,
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    fillsOf: (col: string) => byCol.get(col) ?? 0,
    colours: () => [...byCol.keys()],
  };
  const checkNums = (args: unknown[]): void => {
    for (const a of args) {
      if (typeof a === 'number') assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
    }
  };
  const noop = (...args: unknown[]): void => checkNums(args);
  return new Proxy(counter, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      const count = () => {
        target.fills++;
        byCol.set(target.fillStyle, (byCol.get(target.fillStyle) ?? 0) + 1);
        if (target.fillStyle === ink) target.inkFills++;
      };
      if (prop === 'fill') return count;
      if (prop === 'fillRect') {
        return (...args: unknown[]) => {
          checkNums(args);
          count();
        };
      }
      return noop;
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & {
    fills: number;
    inkFills: number;
    fillsOf: (col: string) => number;
    colours: () => string[];
  };
}

const S = 44;
const TH = 0.46 * S;
const HEAD_R = 0.15 * S * 0.9;
const FACINGS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);

function headFrame(dir: number, gape = 0, hurt = false, nowMs = 1234) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: S,
    headX: fx * 0.1 * S,
    headY: -TH - HEAD_R * 0.25,
    hw: HEAD_R * 1.04,
    hh: HEAD_R,
    cut: HEAD_R * 0.34,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt,
    nowMs,
    gape,
  };
}

function bodyFrame(dir: number, hurt = false) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: S,
    tw: 0.185 * S * 1.3,
    ww: 0.125 * S * 0.85,
    th: TH,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt,
    nowMs: 1234,
  };
}

/** Every painter of the dialect at one heading, on one recording ctx. */
function paintAll(ctx: ReturnType<typeof mockCtx>, dl: DolmenLook, dir: number, hurt = false): void {
  paintDolmenHead(ctx, dl, headFrame(dir, 0.6, hurt));
  paintDolmenBody(ctx, dl, bodyFrame(dir, hurt), hurt, 'behind');
  paintDolmenBody(ctx, dl, bodyFrame(dir, hurt), hurt, 'front');
  paintDolmenFoot(ctx, dl, 0, 12, S, Math.cos(dir), 1, hurt);
  drawDolmenArm(ctx, dl, -6, -20, -8, -12, -6, -4, S, hurt, 1234, Math.sin(dir));
  drawDolmenPlumb(ctx, pendantRest(S * 0.22), dl, S, hurt);
}

test('the whole dialect paints clean at all eight facings, hurt and whole, for every look', () => {
  for (const dl of Object.values(DOLMEN_LOOKS) as DolmenLook[]) {
    for (const dir of FACINGS) {
      for (const hurt of [false, true]) {
        const ctx = mockCtx(dl.ink);
        paintAll(ctx, dl, dir, hurt);
        assert.ok(ctx.fills > 0, 'every band paints a body');
        if (hurt) assert.equal(ctx.inkFills, 0, 'the hurt flash keeps the silhouette clean of ink');
      }
    }
  }
});

test('THE SHADE FLOOR FROM BEHIND: at N, NE and NW no fill of any look sinks under #3', () => {
  for (const id of IDS) {
    const dl = dolmenLook(id, 5);
    for (const dir of [-Math.PI / 2, -Math.PI / 4, (-3 * Math.PI) / 4]) {
      const ctx = mockCtx(dl.ink);
      paintAll(ctx, dl, dir);
      for (const col of ctx.colours()) {
        if (!col.startsWith('#') || col === '#ffffff') continue;
        assert.ok(clearsFloor(col), `${id} at dir ${dir.toFixed(2)}: fill ${col} sinks under the floor`);
      }
    }
  }
});

test('NO FACE FROM BEHIND: the north band and both rear diagonals paint no ink, for every look', () => {
  for (const dl of Object.values(DOLMEN_LOOKS) as DolmenLook[]) {
    const south = mockCtx(dl.ink);
    paintDolmenHead(south, dl, headFrame(Math.PI / 2));
    assert.ok(south.inkFills > 0, `${dl.stratum}: the face reads at the bow`);
    for (const dir of [-Math.PI / 2, -Math.PI / 4, (-3 * Math.PI) / 4]) {
      const rear = mockCtx(dl.ink);
      paintDolmenHead(rear, dl, headFrame(dir));
      assert.equal(rear.inkFills, 0, `${dl.stratum}: no face ink survives dir ${dir.toFixed(2)}`);
    }
  }
});

test('THE THREE-QUARTER KEEPS BOTH EYES, for every look', () => {
  for (const dl of Object.values(DOLMEN_LOOKS) as DolmenLook[]) {
    for (const dir of [Math.PI / 4, (3 * Math.PI) / 4]) {
      const ctx = mockCtx(dl.ink);
      paintDolmenHead(ctx, dl, headFrame(dir));
      assert.ok(ctx.inkFills >= 2, `${dl.stratum}: both tick eyes hold through the three-quarter turn`);
      if (dl.glint) assert.ok(ctx.fillsOf(dl.glint) >= 2, 'both eyes carry the glint');
    }
  }
});

test('HEADLESS FROM BEHIND READS AS A HOOD: the back plate rises 0.05s over the crown, on every yoke', () => {
  const f = headFrame(-Math.PI / 2);
  const hull = dolmenHeadHull(f.hw, f.hh, f.fx, f.fy);
  const crownY = f.headY + hull.st(0, 0, hull.crownZ).y;
  const marlMargin = crownY - dolmenYokeRim(f, DOLMEN_LOOKS['dolmen']!).y;
  for (const id of IDS) {
    const dl = DOLMEN_LOOKS[id]!;
    const rim = dolmenYokeRim(f, dl);
    assert.ok(
      rim.y <= crownY - 0.05 * S + 1e-6,
      `${id}: the rim (${rim.y.toFixed(2)}) sits 0.05s above the crown (${crownY.toFixed(2)})`,
    );
    assert.ok(rim.d > 0.5, `${id}: the nape rim faces the camera from the north band`);
    const ctx = mockCtx(dl.ink);
    paintDolmenHead(ctx, dl, f);
    assert.ok(ctx.fillsOf(dl.yoke) > 0, `${id}: the back plate paints over the head from behind`);
    // From the bow the same rim is the far wall, painted by the body's
    // behind pass — the head painter leaves the plate to it.
    const bow = mockCtx(dl.ink);
    paintDolmenBody(bow, dl, bodyFrame(Math.PI / 2), false, 'behind');
    assert.ok(bow.fills > 0, `${id}: the far wall paints behind the head at the bow`);
  }
  // The Sinter's hood clears the crown by more than the Marl's.
  assert.ok(crownY - dolmenYokeRim(f, DOLMEN_LOOKS['dolmen_sinter']!).y > marlMargin, 'the tallest hooded yoke');
  // The Culm's notch never reaches the nape: hRim(pi) is the plain
  // hBack, and the dip exists off the shoulder.
  const culm = dolmenYoke(DOLMEN_LOOKS['dolmen_culm']!, S, TH, 0, -1);
  assert.ok(Math.abs(culm.hRim(Math.PI) - culm.hBack) < 1e-9, 'the nape stands at the plain rim height');
  assert.ok(culm.hRim(NOTCH_THETA) < culm.hRim(1.9), 'the notch dips over one shoulder');
  assert.ok(culm.hRim(NOTCH_THETA) < culm.hRim(Math.PI), 'the dip is real');
  // Every other yoke is un-notched at the shoulder station.
  const marl = dolmenYoke(DOLMEN_LOOKS['dolmen']!, S, TH, 0, -1);
  assert.ok(Math.abs(marl.hRim(Math.PI) - S * 0.315) < 1e-9, 'the Marl rim is the 9a literal');
});

test('BEADS FROM THE NORTH: all three show from behind, none from the bow', () => {
  for (const id of ['dolmen_gossan', 'dolmen_champion'] as const) {
    const dl = DOLMEN_LOOKS[id]!;
    const north = mockCtx(dl.ink);
    paintDolmenHead(north, dl, headFrame(-Math.PI / 2));
    paintDolmenBody(north, dl, bodyFrame(-Math.PI / 2), false, 'behind');
    assert.ok(north.fillsOf(dl.bead!) >= 3, `${id}: three dull studs on the back plate rim from the north`);
    const south = mockCtx(dl.ink);
    paintDolmenHead(south, dl, headFrame(Math.PI / 2));
    paintDolmenBody(south, dl, bodyFrame(Math.PI / 2), false, 'behind');
    assert.equal(south.fillsOf(dl.bead!), 0, `${id}: no rim bead from the bow (the girdle lives on the bib)`);
    const front = mockCtx(dl.ink);
    paintDolmenBody(front, dl, bodyFrame(Math.PI / 2), false, 'front');
    assert.equal(front.fillsOf(dl.bead!), dl.girdle, `${id}: the girdle on the hem at the bow`);
  }
});

test('TICKS ARE TICKS: the Sinter hangs three to five short drops from the rim, each under 0.04s', () => {
  const dl = DOLMEN_LOOKS['dolmen_sinter']!;
  const north = mockCtx(dl.ink);
  paintDolmenHead(north, dl, headFrame(-Math.PI / 2));
  assert.ok(north.fillsOf(dl.crust!) >= 3, 'the ticks read from the north');
  for (let seed = 0; seed < 40; seed++) {
    const yk = dolmenYoke(dl, S, TH, 0, -1);
    const ticks = dolmenRimFixtures(dl, yk, S, seed);
    assert.ok(ticks.length >= 3 && ticks.length <= 5, `seed ${seed}: three to five ticks`);
    for (const t of ticks) {
      assert.equal(t.kind, 'tick');
      assert.ok(t.len <= 0.04 * S, `seed ${seed}: a tick, never a plate (${(t.len / S).toFixed(3)}s)`);
      assert.ok(t.len >= 0.03 * S, `seed ${seed}: a drop, never a hairline (${(t.len / S).toFixed(3)}s)`);
      assert.ok(Math.abs(t.theta - Math.PI) <= 1.0 + 0.16, 'on the back arc, so three read from the north');
    }
  }
  const beads = dolmenRimFixtures(DOLMEN_LOOKS['dolmen_gossan']!, dolmenYoke(DOLMEN_LOOKS['dolmen_gossan']!, S, TH, 0, -1), S, 5);
  assert.deepEqual(beads.map((b) => b.theta), [Math.PI, Math.PI - 0.55, Math.PI + 0.55]);
  assert.equal(dolmenRimFixtures(DOLMEN_LOOKS['dolmen']!, dolmenYoke(DOLMEN_LOOKS['dolmen']!, S, TH, 0, -1), S, 5).length, 0, 'the Marl is plain');
});

test('BOB FORM: a pale stone shades down (the 9a pair); a dark stone goes lighter and clears the floor', () => {
  const pale = bobForm('#f5f1e8');
  assert.equal(pale.side, shade('#f5f1e8', -22));
  assert.equal(pale.base, shade('#f5f1e8', -40));
  const dark = bobForm('#3a3733');
  for (const c of [dark.side, dark.base]) for (const v of rgb(c)) assert.ok(v >= 0x30, `${c} clears the floor`);
  for (const id of IDS) {
    const form = bobForm(DOLMEN_LOOKS[id]!.bob);
    assert.ok(clearsFloor(form.side) && clearsFloor(form.base), `${id}: the bob's form clears the floor`);
  }
});

test('THE STONE FACE: the gape is accepted and ignored, for every look', () => {
  for (const dl of Object.values(DOLMEN_LOOKS) as DolmenLook[]) {
    for (const dir of [Math.PI / 2, Math.PI / 4, 0]) {
      const shut = mockCtx(dl.ink);
      paintDolmenHead(shut, dl, headFrame(dir, 0));
      const shout = mockCtx(dl.ink);
      paintDolmenHead(shout, dl, headFrame(dir, 1));
      assert.equal(shout.fills, shut.fills, 'no fill answers the gape');
      assert.equal(shout.inkFills, shut.inkFills, 'no ink answers the gape');
    }
  }
});

test('THE LEVEL GAIT twin law: one helper, both hip sites, no literal left behind', () => {
  assert.equal(walkBobK({} as RigPose), 0.45, 'every other body keeps its bob');
  assert.equal(walkBobK({ dolmen: DOLMEN_LOOKS['dolmen'] } as RigPose), DOLMEN_BOB);
  assert.ok(DOLMEN_BOB >= 0.05 && DOLMEN_BOB <= 0.15, 'the dial lands inside the art lane');
  const src = readFileSync(resolve(HERE, 'rig.ts'), 'utf8');
  const sites = src.split('\n').filter((l) => /const hipY(Stand)? = rig\.y - \(rig\.rise \+ rig\.bob \* /.test(l));
  assert.equal(sites.length, 2, 'drawHumanoid hipYStand and drawBackGear hipY');
  for (const line of sites) {
    assert.ok(line.includes('walkBobK(rig)'), `the dial is the helper: ${line.trim()}`);
    assert.ok(!line.includes('0.45'), `no literal bob survives: ${line.trim()}`);
  }
});

test('THE PLUMB KEEPS ITS LAYER: the front/behind switch latches, cardinals resolve outside the band', () => {
  // Stateless callers (the sheet, the card): the plain threshold at the band's middle.
  assert.equal(dolmenPlumbFront(undefined, 0.05), true);
  assert.equal(dolmenPlumbFront(undefined, -0.05), false);
  // With a memory the flag holds its last state anywhere inside the band.
  const mem: { bands?: Record<string, boolean> } = {};
  assert.equal(dolmenPlumbFront(mem, PLUMB_FRONT_ON + 0.2), true, 'front past ON');
  assert.equal(dolmenPlumbFront(mem, -0.05), true, 'holds front inside the band');
  assert.equal(dolmenPlumbFront(mem, PLUMB_FRONT_OFF - 0.05), false, 'behind past OFF');
  assert.equal(dolmenPlumbFront(mem, 0.05), false, 'holds behind inside the band');
  assert.equal(dolmenPlumbFront(mem, PLUMB_FRONT_ON), true, 'ON is inclusive');
  // Every cardinal facing's root depth lies outside the dead zone, so a
  // settled heading resolves exactly as the old threshold did — and the
  // plumb hangs from the same station on every stratum.
  for (const id of IDS) {
    for (let i = 0; i < 8; i++) {
      const dir = Math.PI / 2 + (i / 8) * Math.PI * 2;
      const root = dolmenPlumbRoot(DOLMEN_LOOKS[id]!, S, S * 0.36, Math.cos(dir), Math.sin(dir));
      const marl = dolmenPlumbRoot(DOLMEN_LOOKS['dolmen']!, S, S * 0.36, Math.cos(dir), Math.sin(dir));
      assert.ok(Math.abs(root.x - marl.x) < 1e-9 && Math.abs(root.y - marl.y) < 1e-9, `${id} band ${i}: the plumb hangs the same on every stratum`);
      const d = root.d;
      assert.ok(d >= PLUMB_FRONT_ON || d <= PLUMB_FRONT_OFF, `band ${i} root depth ${d.toFixed(3)} sits outside the band`);
      assert.equal(dolmenPlumbFront({}, d), d >= 0, `band ${i} resolves as the plain threshold`);
    }
  }
  // The rig hands ONE latched answer to both passes.
  const src = readFileSync(resolve(HERE, 'rig.ts'), 'utf8');
  const passes = src.split('\n').filter((l) => /plumb: dolPlumb, plumbFront: dolPlumbFront/.test(l));
  assert.equal(passes.length, 2, 'the behind pass and the front pass both carry the latch');
  assert.ok(/dolPlumbFront = dolmenPlumbFront\(rig\.depthMemory, pr\.d\)/.test(src), 'latched on the entity depth memory');
  assert.ok(/const pr = dolmenPlumbRoot\(dol, s, th, fx, fy\)/.test(src), 'the rig passes the look to the root');
});

test('THE ONE REST: a settled PendantSim equals pendantRest', () => {
  const len = S * 0.22;
  const sim = new PendantSim(5);
  sim.update(0, 0, len, 0);
  // One shove sideways, then the anchor holds still.
  sim.update(3, 0, len, 16);
  let chain = sim.update(3, 0, len, 32);
  for (let i = 3; i <= 600; i++) chain = sim.update(3, 0, len, i * 16);
  const rest = pendantRest(len);
  assert.equal(chain.pts.length, rest.pts.length);
  // The verlet's two-pass root-out constraint leaves a uniform gravity
  // stretch of 0.22% of the cord (0.02 px at the test scale, 0.05 px
  // at the sheet's 110, a tenth of a pixel at 220) — sub-pixel at
  // every zoom, so the sheet and the card paint what the game relaxes
  // to. Pinned honestly: no sway at all, and the sag under 0.3%.
  for (let i = 0; i < rest.pts.length; i++) {
    assert.ok(Math.abs(chain.pts[i]!.x - rest.pts[i]!.x) < 0.01, `node ${i} hangs dead-true`);
    assert.ok(Math.abs(chain.pts[i]!.y - rest.pts[i]!.y) <= len * 0.003, `node ${i} y settles`);
  }
  assert.ok(!sim.restless, 'a settled plumb stops re-baking the body');
});

const DT = 1 / 60;
function settle(rag: Ragdoll, v0: number, seconds = 6): void {
  let v = v0;
  for (let t = 0; t < seconds; t += DT) {
    if (rag.settled) break;
    const ov = v;
    v *= Math.max(0, 1 - (2 + 9 * rag.groundedFrac()) * DT);
    rag.step(DT, v - ov, 0);
  }
}

test('THE CORPSE: every look falls with its head inside its collar, shut eyes, a bare foot and a slack plumb', () => {
  for (const id of IDS) {
    const dl = dolmenLook(id, 77);
    const size = STATURE[id];
    const rag = buildHumanoidRagdoll(size, 77);
    rag.launch(0.8, 0, 0.6, HUMANOID_UPPER, HUMANOID_FEET);
    settle(rag, 2.5);
    const look: HumanoidCorpseLook = {
      bodyColor: dl.hide,
      skinColor: dl.hide,
      hairColor: shade(dl.hide, -24),
      size,
      dol: dl,
    };
    const ctx = mockCtx(dl.ink);
    drawHumanoidRagdoll(ctx, rag, { ax: 400, ay: 300, s: 96 }, look, 1234);
    assert.ok(ctx.fills > 0, `${id}: the corpse paints`);
    assert.equal(ctx.fillsOf(dl.eye), 0, `${id}: the eyes are shut — no pale tick`);
    assert.equal(ctx.inkFills, 0, `${id}: no ink fill on the fallen face (the lids are strokes)`);
    assert.ok(ctx.fillsOf(dl.bob) >= 1, `${id}: the static plumb's bob lies at the cord's end`);
    assert.ok(ctx.fillsOf(dl.bib) >= 1, `${id}: the bib lies on the trunk`);
    assert.ok(ctx.fillsOf(dl.yoke) >= 2, `${id}: the collar and the slab lie on the ground`);
    assert.equal(ctx.fillsOf('#4a3324'), 0, `${id}: the BOOT fallback never paints on a Dolmen`);
    assert.equal(ctx.fillsOf(shade(dl.hide, -24)), 0, `${id}: no hair slab on a Dolmen`);
    if (dl.rimKind === 'beads') assert.ok(ctx.fillsOf(dl.bead!) >= 3 + dl.girdle!, `${id}: the beads outlive the body`);
    if (dl.rimKind === 'ticks') assert.ok(ctx.fillsOf(dl.crust!) >= 3, `${id}: the ticks outlive the body`);
    // THE FALLEN RIM: the fixtures lie across the collar's rim end as
    // they sit on the live ring — three beads a clear diameter apart,
    // the ticks spread along the crown — never one stud on a point.
    const headR = 0.15 * 96;
    const stations = dolmenFallenRimStations(dl, 96, headR * 1.04, headR);
    if (dl.rimKind === 'beads') {
      const beads = stations.filter((st) => st.kind === 'bead');
      assert.equal(beads.length, 3, `${id}: three beads on the fallen rim`);
      for (let a = 0; a < beads.length; a++) {
        for (let b = a + 1; b < beads.length; b++) {
          const gap = Math.hypot(beads[a]!.x - beads[b]!.x, beads[a]!.y - beads[b]!.y);
          assert.ok(gap >= 2 * beads[a]!.len, `${id}: fallen beads ${a}/${b} stack (${(gap / beads[a]!.len).toFixed(2)}r apart)`);
        }
      }
    }
    if (dl.rimKind === 'ticks') {
      const xs = stations.filter((st) => st.kind === 'tick').map((st) => st.x);
      assert.ok(xs.length >= 3, `${id}: the ticks lie on the fallen rim`);
      assert.ok(Math.max(...xs) - Math.min(...xs) >= 0.08 * 96, `${id}: the fallen ticks spread across the rim, never one blob`);
    }
    for (const col of ctx.colours()) {
      if (!col.startsWith('#') || col === '#ffffff') continue;
      assert.ok(clearsFloor(col), `${id}: corpse fill ${col} sinks under the floor`);
    }
  }
  // The slack plumb painter on its own: cord, knot, bob.
  const dl = DOLMEN_LOOKS['dolmen_gossan']!;
  const ctx = mockCtx(dl.ink);
  drawDolmenPlumbSlack(ctx, dl, S, 1, 0);
  assert.ok(ctx.fillsOf(dl.bob) >= 1);
  // The corpse size chain reads the same table as the live one.
  const rr = readFileSync(resolve(HERE, 'renderer.ts'), 'utf8');
  assert.ok((rr.match(/Renderer\.DOLMEN_SIZE\[(defId|death\.defId)\]/g) ?? []).length >= 2, 'live and corpse chains read DOLMEN_SIZE');
  assert.ok(/const corpseDol = death\.defId\.startsWith\('dolmen'\)\s*\?\s*dolmenLook\(death\.defId, death\.eid\)/.test(rr), 'the corpse-coat law: the raw eid');
  assert.ok(/dol: corpseDol,/.test(rr), 'the corpse look carries the Dolmen');
});

test('source pins: the olSig carries the stratum, the stoop reads the look, the other stoops stand', () => {
  const rr = readFileSync(resolve(HERE, 'renderer.ts'), 'utf8');
  assert.ok(rr.includes('`T${e.dolmen.stratum[0]}${(e.dolmen.seed ?? 0) & 0xff}`'), 'T<stratum><seed>');
  assert.ok(!/`Tm\$\{/.test(rr), 'no hard-coded Marl tag survives');
  assert.ok(/dolmenLook\(defId, eid, meta\.actor\)/.test(rr), 'the live look takes the actor slug');
  const rig = readFileSync(resolve(HERE, 'rig.ts'), 'utf8');
  assert.ok(rig.includes('? { pitch: dol.stoop ?? 0.1, handDropS: 0.05, hangFwdS: 0.09, hangDropS: 0.04 }'), 'the Dolmen stoop reads the look');
  assert.ok(rig.includes('? { pitch: 0.18, handDropS: 0.1, hangFwdS: 0.07, hangDropS: 0.05 }'), 'the gnoll stoop is byte-identical');
  assert.ok(rig.includes('? { pitch: 0.18, handDropS: 0.09, hangFwdS: 0.06, hangDropS: 0.04 }'), 'the skral stoop is byte-identical');
  const gr = readFileSync(resolve(HERE, '..', 'cms', 'gameRender.ts'), 'utf8');
  assert.ok(/dolmenLook\(def\.id, 0\)/.test(gr), 'the card passes no slug: THE DESIGN');
});

test('the mirrors agree: size 1.02, the humanoid roster, the 3D stature, the probe off', () => {
  const gr = readFileSync(resolve(HERE, '..', 'cms', 'gameRender.ts'), 'utf8');
  const m = gr.match(/^\s*dolmen:\s*([\d.]+),\s*$/m);
  assert.ok(m, 'gameRender MOB_SIZE carries the dolmen');
  assert.equal(parseFloat(m![1]!), 1.02);
  const rr = readFileSync(resolve(HERE, 'renderer.ts'), 'utf8');
  const rm = rr.match(/DOLMEN_SIZE: Record<string, number> = \{\s*dolmen: ([\d.]+),/);
  assert.ok(rm, 'renderer DOLMEN_SIZE carries the dolmen');
  assert.equal(parseFloat(rm![1]!), 1.02, 'renderer and card agree on the stature');
  assert.ok(isHumanoidMonster('dolmen'));
  assert.ok(isHumanoidMonster('dolmen_setter_body'));
  assert.equal(humanoidMonsterSize('dolmen'), 1.0);
  assert.equal(DOLMEN_HEAD_DEBUG.on, false, 'the probe is a lab lever, off at import');
});
