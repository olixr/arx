/**
 * Greenskin-dialect laws: every goblin NPC id owns a bespoke look (no
 * variant falls back to a reskin), the warboss is a DESIGN and not a
 * scale-up (own hide, true tusks, the war-knot, the only scarred
 * cheek), the rank-and-file rolls a HIDE CLUSTER from its spawn seed
 * (a camp reads as individuals — deterministically, never a flicker)
 * while the casters and the warboss hold their authored designs, the
 * head and torso painters run clean across all eight facing bands (no
 * NaN geometry), the face never shows from behind, the wing ears live
 * on the wall clock and pin back through the strike beat, the jaw
 * jeers open mid-swing, and the loot-story law holds: what each
 * variant swings and wears really drops.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TABLES, NPCS } from '@arx/content';
import {
  GOBLIN_LOOKS,
  goblinLook,
  paintGoblinHead,
  paintGoblinTorso,
  type GoblinLook,
} from './rig.js';
import { earRestChain, type EarCarriage } from './earPhysics.js';

test('every goblin NPC has its own authored look', () => {
  const goblinIds = [...NPCS.keys()].filter((id) => id.startsWith('goblin'));
  assert.ok(goblinIds.length >= 5, 'the warband fields the rabble, the casters, and the warboss');
  for (const id of goblinIds) {
    assert.ok(GOBLIN_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file design, never crash.
  assert.equal(goblinLook('goblin_new_thing', 7).hide, GOBLIN_LOOKS['goblin']!.hide);
});

test('the warboss is a design, not a scale-up', () => {
  const chopper = GOBLIN_LOOKS['goblin']!;
  const boss = GOBLIN_LOOKS['goblin_champion']!;
  assert.ok(chopper.heavy < boss.heavy, 'the warboss carries the heavier frame');
  assert.notEqual(chopper.hide, boss.hide, 'each variant wears its own hide');
  assert.notEqual(chopper.eye, boss.eye, 'even the eyes burn their own color');
  assert.ok(boss.tusks && !chopper.tusks, 'only the warboss jaw carries true tusks');
  assert.ok(boss.scarred && !chopper.scarred, 'only the warboss carries the ledger of scars');
  assert.ok(boss.topknot && !chopper.topknot, 'the war-knot is the crown, and there is one crown');
});

test('the casters wear the school, the rabble wears rope', () => {
  assert.ok(GOBLIN_LOOKS['goblin_firecaller']!.garb, 'the firecaller wears the ember shawl');
  assert.ok(GOBLIN_LOOKS['goblin_gloomcaller']!.garb, 'the gloomcaller wears the murk shawl');
  assert.notEqual(
    GOBLIN_LOOKS['goblin_firecaller']!.garb,
    GOBLIN_LOOKS['goblin_gloomcaller']!.garb,
    'each school dyes its own rags',
  );
  assert.ok(!GOBLIN_LOOKS['goblin']!.garb, 'the chopper owns a rope, a pouch, and optimism');
  assert.ok(!GOBLIN_LOOKS['goblin_thrower']!.garb, 'the thrower likewise');
});

test('the hide clusters: seeded, deterministic, and never on the named', () => {
  // Different cluster bits roll different hides...
  const a = goblinLook('goblin', 0);
  const b = goblinLook('goblin', 8);
  assert.notEqual(a.hide, b.hide, 'seeds in different clusters wear different hides');
  // ...the same seed always wears the same hide (cached identity)...
  assert.equal(goblinLook('goblin', 8), b, 'a body keeps its hide frame to frame');
  // ...the thrower rolls the same camp stock...
  assert.notEqual(goblinLook('goblin_thrower', 0).hide, goblinLook('goblin_thrower', 8).hide);
  // ...and the named never roll: their designs hold at any seed.
  for (const id of ['goblin_firecaller', 'goblin_gloomcaller', 'goblin_champion']) {
    const authored = GOBLIN_LOOKS[id]!;
    assert.equal(goblinLook(id, 0).hide, authored.hide, `${id} holds its design`);
    assert.equal(goblinLook(id, 8).hide, authored.hide, `${id} holds its design at any seed`);
  }
  // The wear marks stay the body's own either way.
  assert.equal(goblinLook('goblin_champion', 8).seed, 8);
});

test('the warband swarms as one camp and the warboss slams', () => {
  const chopper = NPCS.get('goblin')!;
  const boss = NPCS.get('goblin_champion')!;
  assert.equal(chopper.pack, 'goblin');
  assert.equal(boss.pack, 'goblin', 'pull the warboss, raise the warband');
  assert.ok(chopper.craven, 'a bloodied chopper runs for its fellows');
  assert.equal(boss.kit?.[0]?.ability, 'ground_slam', 'the slam clears the room the camp rallies into');
  assert.ok(chopper.level < boss.level && chopper.maxHp < boss.maxHp);
  assert.equal(boss.attackStatus?.status, 'bleed', 'the tusk gore keeps arguing');
});

test('the loot-story law: the tusk, the leather, and the swung iron really drop', () => {
  const boss = LOOT_TABLES.get('goblin_champion')!;
  assert.ok(boss.entries.some((e) => e.item === 'warboss_tusk'), 'the trophy pays');
  assert.ok(boss.entries.some((e) => e.item === 'leather_body'), 'the leather on its back drops');
  // The gobmangler it swings and the warboard it hides behind both
  // live in the scavenged-camp rack its loot list carries.
  const arms = LOOT_TABLES.get('goblin_arms')!;
  assert.ok(arms.entries.some((e) => e.item === 'gobmangler'));
  assert.ok(arms.entries.some((e) => e.item === 'gobnail_warboard'));
  for (const id of ['goblin', 'goblin_champion']) {
    assert.ok(NPCS.get(id)!.loot.includes('goblin_arms'), `${id} pays for what it carries`);
  }
});

/** A recording 2D-context stand-in: counts calls, rejects NaN coords. */
function mockCtx(): CanvasRenderingContext2D & {
  fills: number;
  darkFills: number;
  coordSum: number;
} {
  const counter = {
    fills: 0,
    darkFills: 0,
    coordSum: 0,
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  const checkNums = (args: unknown[]): void => {
    for (const a of args) {
      if (typeof a === 'number') {
        assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
        counter.coordSum += a;
      }
    }
  };
  const noop = (...args: unknown[]): void => checkNums(args);
  return new Proxy(counter, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      const count = () => {
        target.fills++;
        if (typeof target.fillStyle === 'string' && target.fillStyle.startsWith('#2')) {
          target.darkFills++;
        }
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
    darkFills: number;
    coordSum: number;
  };
}

const FACINGS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);

function headFrame(dir: number, gape = 0, nowMs = 1234) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    headX: fx * 2.2,
    headY: -28,
    hw: 6.9,
    hh: 6.6,
    cut: 2.2,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt: false,
    nowMs,
    gape,
  };
}

function bodyFrame(dir: number) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    tw: 7.5,
    ww: 6.4,
    th: 18,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt: false,
  };
}

test('head and torso paint clean at all eight facings for every variant', () => {
  for (const gb of Object.values(GOBLIN_LOOKS) as GoblinLook[]) {
    for (const dir of FACINGS) {
      const ctx = mockCtx();
      paintGoblinHead(ctx, gb, headFrame(dir));
      assert.ok(ctx.fills > 4, 'the head is a built form, not a single block');
      paintGoblinTorso(ctx, gb, bodyFrame(dir));
      assert.ok(ctx.fills > 8, 'the gut, the belt, and the pouch all land');
    }
  }
});

test('the face never shows from behind', () => {
  for (const gb of Object.values(GOBLIN_LOOKS) as GoblinLook[]) {
    const front = mockCtx();
    paintGoblinHead(front, gb, headFrame(Math.PI / 2)); // facing down-screen
    const back = mockCtx();
    paintGoblinHead(back, gb, headFrame(-Math.PI / 2)); // facing away
    // Facing the camera carries both slit pupils and the nostril; from
    // behind the head is hide courses, the nape wedge, and ear backs.
    assert.ok(front.darkFills >= 2, 'front band carries the pupils and the nostril');
    assert.equal(back.darkFills, 0, 'back band shows hide and ears, not a face');
  }
});

test('the warboss face carries more than the rabble’s — tusks, knot, and scar', () => {
  const chopper = mockCtx();
  paintGoblinHead(chopper, GOBLIN_LOOKS['goblin']!, headFrame(Math.PI / 2));
  const boss = mockCtx();
  paintGoblinHead(boss, GOBLIN_LOOKS['goblin_champion']!, headFrame(Math.PI / 2));
  assert.ok(boss.fills > chopper.fills, 'the tusks and the war-knot are painted mass');
});

test('the jaw jeers through the strike beat', () => {
  const gb = GOBLIN_LOOKS['goblin_champion']!;
  const shut = mockCtx();
  paintGoblinHead(shut, gb, headFrame(Math.PI / 2, 0));
  const open = mockCtx();
  paintGoblinHead(open, gb, headFrame(Math.PI / 2, 1));
  assert.ok(open.fills > shut.fills, 'the gape opens the maw and bares the lower needles');
});

test('the wing ears are elastic bodies rooted on the skull azimuth', () => {
  // THE EAR IS A SIMULATION (earPhysics.ts): the head painter no
  // longer rigs ears per band — one projected carriage serves every
  // facing. The laws that used to live in blend arithmetic are now
  // properties of the projection, and pinned here.
  const c: EarCarriage = {
    azimuth: 2.0,
    rootR: 0.19,
    rootLift: 0.05,
    length: 0.26,
    spread: 0.85,
    rise: 0.95,
    curl: [0, 0.16, 0.34],
  };
  // At the E band BOTH blades rake behind the facing and STAND — an
  // ear can never point forward like a nose again, by construction.
  for (const side of [-1, 1] as const) {
    const ch = earRestChain(side, c, { dir: 0, pin: 0, sway: 0 });
    const root = ch.pts[0]!;
    const tip = ch.pts[3]!;
    assert.ok(tip.x < root.x, 'facing east the blade rakes west, behind the head');
    assert.ok(tip.y < root.y, 'the blade stands up-screen, never level');
  }
  // The depth law at every cardinal: profile splits the pair around
  // the skull, face-on tucks both behind, from behind both backs show.
  assert.ok(earRestChain(1, c, { dir: 0, pin: 0, sway: 0 }).depth > 0);
  assert.ok(earRestChain(-1, c, { dir: 0, pin: 0, sway: 0 }).depth < 0);
  for (const side of [-1, 1] as const) {
    assert.ok(earRestChain(side, c, { dir: Math.PI / 2, pin: 0, sway: 0 }).depth < 0);
    assert.ok(earRestChain(side, c, { dir: -Math.PI / 2, pin: 0, sway: 0 }).depth > 0);
  }
  // The jeer pins the pair around toward the occiput...
  const calm = earRestChain(1, c, { dir: 0, pin: 0, sway: 0 });
  const angry = earRestChain(1, c, { dir: 0, pin: 1, sway: 0 });
  assert.notDeepEqual(calm.pts, angry.pts, 'anger moves the whole silhouette');
  // ...and the listening sway moves the blades between moments.
  const t0 = earRestChain(1, c, { dir: Math.PI / 2, pin: 0, sway: 0.05 });
  const t1 = earRestChain(1, c, { dir: Math.PI / 2, pin: 0, sway: -0.05 });
  assert.notDeepEqual(t0.pts, t1.pts, 'the ears sway between moments');
});

test('the casters’ shawl is painted mass the rabble does not carry', () => {
  const bare = mockCtx();
  paintGoblinTorso(bare, GOBLIN_LOOKS['goblin']!, bodyFrame(Math.PI / 2));
  const robed = mockCtx();
  paintGoblinTorso(robed, GOBLIN_LOOKS['goblin_firecaller']!, bodyFrame(Math.PI / 2));
  assert.ok(robed.fills > bare.fills, 'the shawl and its torn hem land over the gut');
});
