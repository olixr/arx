/**
 * Fur-dialect laws: every gnoll NPC id owns a bespoke look (no variant
 * falls back to a reskin), the packlord is a DESIGN and not a scale-up
 * (own coat, taller crest, the only scarred muzzle), the rank-and-file
 * rolls a COAT CLUSTER from its spawn seed (a warband reads as
 * individuals — deterministically, never a flicker), the head, crest,
 * and tail painters run clean across all eight facing bands (no NaN
 * geometry), the face never shows from behind (the cattle muzzle law),
 * the tail wags on the wall clock, the jaw cackles through the strike
 * beat, and the loot-story law holds: what each variant swings and
 * wears really drops.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TABLES, NPCS } from '@arx/content';
import {
  GNOLL_LOOKS,
  gnollLook,
  paintGnollCrest,
  paintGnollHead,
  paintGnollTail,
  type GnollLook,
} from './rig.js';

test('every gnoll NPC has its own authored look', () => {
  const gnollIds = [...NPCS.keys()].filter((id) => id.startsWith('gnoll'));
  assert.ok(gnollIds.length >= 2, 'the warband fields the skulker and the packlord');
  for (const id of gnollIds) {
    assert.ok(GNOLL_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file design, never crash.
  assert.equal(gnollLook('gnoll_new_thing', 7).fur, GNOLL_LOOKS['gnoll']!.fur);
});

test('the packlord is a design, not a scale-up', () => {
  const skulker = GNOLL_LOOKS['gnoll']!;
  const boss = GNOLL_LOOKS['gnoll_champion']!;
  assert.ok(skulker.heavy < boss.heavy, 'the packlord carries the heavier frame');
  assert.notEqual(skulker.fur, boss.fur, 'each variant wears its own coat');
  assert.notEqual(skulker.mane, boss.mane, 'the crest is its own design');
  assert.notEqual(skulker.skin, boss.skin, 'even the bare hide differs');
  assert.ok(boss.scarred && !skulker.scarred, 'only the packlord carries the ledger of scars');
});

test('the coat clusters: seeded, deterministic, and never on the packlord', () => {
  // Different cluster bits roll different coats...
  const a = gnollLook('gnoll', 0);
  const b = gnollLook('gnoll', 8);
  assert.notEqual(a.fur, b.fur, 'seeds in different clusters wear different coats');
  // ...the same seed always wears the same coat (cached identity)...
  assert.equal(gnollLook('gnoll', 8), b, 'a body keeps its coat frame to frame');
  // ...and the packlord never rolls: its design holds at any seed.
  const boss = GNOLL_LOOKS['gnoll_champion']!;
  assert.equal(gnollLook('gnoll_champion', 0).fur, boss.fur);
  assert.equal(gnollLook('gnoll_champion', 8).fur, boss.fur);
  // The spot field stays the body's own either way.
  assert.equal(gnollLook('gnoll_champion', 8).seed, 8);
});

test('the warband hunts as one pack and the packlord laughs', () => {
  const skulker = NPCS.get('gnoll')!;
  const boss = NPCS.get('gnoll_champion')!;
  assert.equal(skulker.pack, 'gnoll');
  assert.equal(boss.pack, 'gnoll', 'pull the packlord, raise the warband');
  assert.ok(skulker.craven, 'a bloodied skulker runs for its fellows');
  assert.equal(boss.special?.ability, 'ravening_cackle', 'the laugh that runs the warband');
  assert.ok(skulker.level < boss.level && skulker.maxHp < boss.maxHp);
});

test('the loot-story law: hide, mane, and the swung steel really drop', () => {
  const skulker = LOOT_TABLES.get('gnoll')!;
  const boss = LOOT_TABLES.get('gnoll_champion')!;
  assert.ok(skulker.entries.some((e) => e.item === 'gnoll_hide'));
  assert.ok(boss.entries.some((e) => e.item === 'packlord_mane'));
  // Both carry goblin_arms (the scavenged-camp racks): the rustbite the
  // skulker swings and the greatblade the packlord hauls both live there.
  const arms = LOOT_TABLES.get('goblin_arms')!;
  assert.ok(arms.entries.some((e) => e.item === 'rustbite'));
  assert.ok(arms.entries.some((e) => e.item === 'iron_greatblade'));
  for (const id of ['gnoll', 'gnoll_champion']) {
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

function headFrame(dir: number, gape = 0) {
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
    nowMs: 1234,
    gape,
  };
}

function tailFrame(dir: number) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    nowMs: 1234,
    runF: 0.5,
    poleX: fx,
    hurt: false,
  };
}

function humpFrame(dir: number) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    tw: 8.1,
    th: 18,
    fx,
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    hurt: false,
  };
}

test('head, crest, and tail paint clean at all eight facings for every variant', () => {
  for (const gn of Object.values(GNOLL_LOOKS) as GnollLook[]) {
    for (const dir of FACINGS) {
      const ctx = mockCtx();
      paintGnollHead(ctx, gn, headFrame(dir), 0x5eed);
      assert.ok(ctx.fills > 4, 'the head is a built form, not a single block');
      paintGnollCrest(ctx, gn, humpFrame(dir));
      const afterCrest = ctx.fills;
      assert.ok(afterCrest > 8, 'the crest is a ridge of bristles, not a collar');
      paintGnollTail(ctx, gn, tailFrame(dir));
      assert.ok(ctx.fills > afterCrest, 'the tail is a brush with its dark tip');
    }
  }
});

test('the face never shows from behind', () => {
  for (const gn of Object.values(GNOLL_LOOKS) as GnollLook[]) {
    const front = mockCtx();
    paintGnollHead(front, gn, headFrame(Math.PI / 2), 0x5eed); // facing down-screen
    const back = mockCtx();
    paintGnollHead(back, gn, headFrame(-Math.PI / 2), 0x5eed); // facing away
    // Facing the camera carries both bead pupils and the nose; from
    // behind the head is fur courses, ear backs, and the crest.
    assert.ok(front.darkFills >= 2, 'front band carries both pupils and the nose');
    assert.equal(back.darkFills, 0, 'back band shows fur and crest, not a face');
  }
});

test('the spot field is the body’s own — two seeds, two dapples', () => {
  const gn = GNOLL_LOOKS['gnoll']!;
  const a = mockCtx();
  paintGnollHead(a, gn, headFrame(Math.PI / 2), 0x1111);
  const b = mockCtx();
  paintGnollHead(b, gn, headFrame(Math.PI / 2), 0x7777);
  assert.notEqual(a.coordSum, b.coordSum, 'different seeds scatter different dapple');
});

test('the tail wags on the clock', () => {
  const gn = GNOLL_LOOKS['gnoll']!;
  const sums: number[] = [];
  for (const nowMs of [0, 400, 800]) {
    const ctx = mockCtx();
    paintGnollTail(ctx, gn, { ...tailFrame(0), nowMs });
    sums.push(ctx.coordSum);
  }
  assert.notEqual(sums[0], sums[1], 'the wag travels between frames');
  assert.notEqual(sums[1], sums[2], 'and keeps traveling');
});

test('the jaw cackles through the strike beat', () => {
  const gn = GNOLL_LOOKS['gnoll_champion']!;
  const shut = mockCtx();
  paintGnollHead(shut, gn, headFrame(Math.PI / 2, 0), 0x5eed);
  const open = mockCtx();
  paintGnollHead(open, gn, headFrame(Math.PI / 2, 1), 0x5eed);
  assert.ok(open.fills > shut.fills, 'the gape opens the maw mid-laugh');
});
