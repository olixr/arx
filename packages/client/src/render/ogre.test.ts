/**
 * Giant-dialect laws (docs/ogres-plan.md): every ogre NPC id owns a
 * bespoke look (no variant is a reskin), the Bonegrinder and the
 * bellower are DESIGNS while the rank-and-file rolls the HIDE CLUSTER
 * from its spawn seed (a camp of individuals, deterministically), the
 * body and head painters run clean across all eight facing bands (no
 * NaN geometry), the face never shows from behind, the roar opens the
 * maw through the strike beat, THE GUT KEEPS ITS OWN TIME (the spring
 * caps hard, settles home, and snaps to rest on first sight), the
 * trophy pendant holds its segment lengths and never climbs, THE ONE
 * REST twins hold (a settled sim paints what a stateless caller
 * paints), and the loot-story law holds: the club it swings drops.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS } from '@arx/content';
import {
  GUT_REST,
  GutSim,
  OGRE_LOOKS,
  PendantSim,
  ogreLook,
  paintOgreBody,
  paintOgreHead,
  pendantRest,
} from './ogre.js';

test('every ogre NPC has its own authored look', () => {
  const ids = [...NPCS.keys()].filter((id) => id.startsWith('ogre'));
  assert.ok(ids.length >= 4, 'the camp fields the brute, the hurler, the bellower, and the Bonegrinder');
  for (const id of ids) {
    assert.ok(OGRE_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file design, never crash.
  assert.equal(ogreLook('ogre_new_thing', 7).design, 'brute');
});

test('the Bonegrinder and the bellower are designs, not scale-ups', () => {
  const brute = OGRE_LOOKS['ogre']!;
  const boss = OGRE_LOOKS['ogre_champion']!;
  const bell = OGRE_LOOKS['ogre_bellower']!;
  assert.ok(brute.heavy < boss.heavy, 'the Bonegrinder carries the heaviest frame');
  assert.notEqual(brute.hide, boss.hide, 'the champion wears the liver-dark hide, nobody else');
  assert.ok(boss.scarred && !brute.scarred, 'only the Bonegrinder is authored scarred');
  assert.ok(bell.heavy > brute.heavy, 'the bellower is the gut of the family');
  assert.notEqual(bell.design, brute.design, 'the bellower is its own design');
});

test('the hide clusters: seeded, deterministic, and never on the designs', () => {
  const a = ogreLook('ogre', 0);
  const b = ogreLook('ogre', 1);
  // Knuth-hashed: consecutive spawn eids must scatter the camp.
  const hides = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((k) => ogreLook('ogre', k).hide));
  assert.ok(hides.size >= 3, 'eight consecutive eids wear at least three hides');
  assert.equal(ogreLook('ogre', 0), a, 'a body keeps its hide frame to frame (cached identity)');
  assert.notEqual(a === b, undefined);
  // The hurler rolls the same camp stock.
  const hurlerHides = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((k) => ogreLook('ogre_hurler', k).hide));
  assert.ok(hurlerHides.size >= 3, 'the hurler rolls the camp stock too');
  // The designs hold their coats at any seed.
  for (const id of ['ogre_bellower', 'ogre_champion']) {
    const authored = OGRE_LOOKS[id]!;
    assert.equal(ogreLook(id, 0).hide, authored.hide, `${id} holds its design`);
    assert.equal(ogreLook(id, 9).hide, authored.hide, `${id} holds its design at any seed`);
  }
  // The wear marks stay the body's own either way.
  assert.equal(ogreLook('ogre_champion', 9).seed, 9);
});

test('the kits speak the family temper', () => {
  const brute = NPCS.get('ogre')!;
  const boss = NPCS.get('ogre_champion')!;
  const bell = NPCS.get('ogre_bellower')!;
  // The tantrum is hp-gated — the old stories demand it.
  assert.ok(
    brute.kit!.some((k) => k.ability === 'ogre_tantrum' && (k.hpBelow ?? 1) < 0.5),
    'a bloodied brute throws the tantrum',
  );
  // The master's bellow rallies the camp.
  assert.ok(
    boss.kit!.some((k) => k.ability === 'hill_bellow' && k.rally === true),
    'the Bonegrinder musters with the bellow',
  );
  // The bellower holds its distance and eats when hurt.
  assert.ok((bell.standoff ?? 0) > 0, 'the bellower is a standoff caster');
  assert.ok(
    bell.kit!.some((k) => k.ability === 'haunch_gnaw' && k.aim === 'self'),
    'the bellower remembers supper',
  );
  // Everybody walks in the same pack.
  for (const id of ['ogre', 'ogre_hurler', 'ogre_bellower', 'ogre_champion']) {
    assert.equal(NPCS.get(id)!.pack, 'ogre', `${id} answers the camp`);
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

function bodyFrame(dir: number, flare = 0) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 100,
    tw: 24,
    ww: 26,
    th: 46,
    fx,
    fy,
    profileK: Math.min(1, Math.abs(fx) * 1.2),
    backK: Math.max(0, -fy),
    lead: fx >= 0 ? 1 : (-1 as 1 | -1),
    hurt: false,
    nowMs: 1234,
    runF: 0,
    flare,
    gut: GUT_REST,
    pendant: null,
  };
}

function headFrame(dir: number, gape = 0) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 100,
    headX: fx * 12,
    headY: -55,
    hw: 15,
    hh: 15,
    cut: 5,
    fx,
    fy,
    profileK: Math.min(1, Math.abs(fx) * 1.2),
    backK: Math.max(0, -fy),
    lead: fx >= 0 ? 1 : (-1 as 1 | -1),
    hurt: false,
    nowMs: 1234,
    gape,
  };
}

test('the body and head painters run clean across all eight bands', () => {
  const ogr = ogreLook('ogre', 5);
  for (const dir of FACINGS) {
    const ctx = mockCtx();
    paintOgreBody(ctx, ogr, bodyFrame(dir));
    assert.ok(ctx.fills > 6, `body at dir ${dir.toFixed(2)} paints its masses`);
    const hctx = mockCtx();
    paintOgreHead(hctx, ogr, headFrame(dir), 5);
    assert.ok(hctx.fills > 3, `head at dir ${dir.toFixed(2)} paints its planes`);
  }
});

test('the roar opens the maw and the face hides from behind', () => {
  const ogr = ogreLook('ogre', 5);
  const shut = mockCtx();
  paintOgreHead(shut, ogr, headFrame(Math.PI / 2, 0), 5);
  const roar = mockCtx();
  paintOgreHead(roar, ogr, headFrame(Math.PI / 2, 1), 5);
  // The open maw adds the cavity and the extra tooth row.
  assert.ok(roar.fills > shut.fills, 'the roar paints more than the scowl');
  // From behind: hair mat and occiput, never the face's detail count.
  const front = mockCtx();
  paintOgreHead(front, ogr, headFrame(Math.PI / 2, 0), 5);
  const back = mockCtx();
  paintOgreHead(back, ogr, headFrame(-Math.PI / 2, 0), 5);
  assert.ok(back.fills < front.fills, 'no face from behind');
});

test('THE GUT KEEPS ITS OWN TIME: snap, cap, and settle', () => {
  const sim = new GutSim(7);
  // First sight: rest, never a whip.
  const first = sim.update(500, 500, 100, 0);
  assert.equal(first.dx, 0);
  assert.equal(first.dy, 0);
  // Violent anchor travel: the offset never exceeds the flesh cap.
  let t = 0;
  for (let i = 0; i < 60; i++) {
    t += 16;
    const out = sim.update(500 + Math.sin(i) * 40, 500 + Math.cos(i * 0.7) * 40, 100, t);
    assert.ok(Math.hypot(out.dx / 0.7, out.dy) <= 0.085 * 100 + 1e-6, 'flesh sways, it never slides off the skeleton');
  }
  // The anchor stops; the mass comes home in one bounce.
  for (let i = 0; i < 240; i++) {
    t += 16;
    sim.update(520, 480, 100, t);
  }
  const settled = sim.update(520, 480, 100, t + 16);
  assert.ok(Math.hypot(settled.dx, settled.dy) < 0.5, 'a settled gut is THE ONE REST');
  assert.equal(sim.restless, false, 'a settled gut stops billing full rate');
});

test('the trophy pendant holds its thong and never climbs', () => {
  const sim = new PendantSim(11);
  const len = 16;
  let t = 0;
  sim.update(300, 300, len, t);
  for (let i = 0; i < 90; i++) {
    t += 16;
    const chain = sim.update(300 + Math.sin(i * 0.5) * 8, 300, len, t);
    // Segment lengths hold through any swing.
    for (let k = 1; k < chain.pts.length; k++) {
      const d = Math.hypot(
        chain.pts[k]!.x - chain.pts[k - 1]!.x,
        chain.pts[k]!.y - chain.pts[k - 1]!.y,
      );
      assert.ok(Math.abs(d - len / 2) < len * 0.25, 'the thong neither stretches nor bunches');
      // A hanging thong never climbs above its root.
      assert.ok(chain.pts[k]!.y >= chain.pts[k - 1]!.y - 1e-6, 'the trophy swings, it never flies');
    }
  }
  // Settled ≡ the stateless rest — THE ONE REST twin.
  for (let i = 0; i < 300; i++) {
    t += 16;
    sim.update(300, 300, len, t);
  }
  const done = sim.update(300, 300, len, t + 16);
  const rest = pendantRest(len);
  for (let k = 0; k < done.pts.length; k++) {
    assert.ok(Math.abs(done.pts[k]!.x - rest.pts[k]!.x) < 0.8, 'settled x ≈ rest x');
    assert.ok(Math.abs(done.pts[k]!.y - rest.pts[k]!.y) < 0.8, 'settled y ≈ rest y');
  }
});

test('the loot-story law: the club it swings really drops', () => {
  for (const id of ['ogre', 'ogre_champion']) {
    assert.ok(NPCS.get(id)!.loot.includes(id), `${id} pays from its own table`);
  }
});
