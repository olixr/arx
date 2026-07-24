/**
 * Scale-dialect laws: every kobold NPC id owns a bespoke look (no
 * variant falls back to a reskin), the digmaster is a DESIGN and not a
 * scale-up (own hide, the only mane, a three-candle crown over the
 * digger's one), the head and tail painters run clean across all
 * eight facing bands (no NaN geometry), the face — pupils, nose —
 * never shows from behind while the crown candle burns at EVERY
 * facing, and the loot-story law holds: the pick each variant swings
 * really drops from its own table.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TABLES, NPCS } from '@devcraft/content';
import {
  KOBOLD_LOOKS,
  koboldLook,
  paintKoboldHead,
  paintKoboldTail,
  type KoboldLook,
} from './rig.js';

test('every kobold NPC has its own authored look', () => {
  const koboldIds = [...NPCS.keys()].filter((id) => id.startsWith('kobold'));
  assert.ok(koboldIds.length >= 2, 'the warren fields the digger and the digmaster');
  for (const id of koboldIds) {
    assert.ok(KOBOLD_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file, never crash.
  assert.equal(koboldLook('kobold_new_thing'), KOBOLD_LOOKS['kobold']);
});

test('the digmaster is a design, not a scale-up', () => {
  const digger = KOBOLD_LOOKS['kobold']!;
  const boss = KOBOLD_LOOKS['kobold_digmaster']!;
  assert.ok(digger.heavy < boss.heavy, 'the digmaster carries the heavier frame');
  assert.notEqual(digger.hide, boss.hide, 'each variant weathered its own hide');
  assert.ok(boss.mane && !digger.mane, 'only the digmaster wears the ragged mane');
  assert.ok(
    digger.candles === 1 && boss.candles >= 3,
    'one candle for the digger, a crown of them for the boss',
  );
});

test('the warren hunts as one pack and the boss slams', () => {
  const digger = NPCS.get('kobold')!;
  const boss = NPCS.get('kobold_digmaster')!;
  assert.equal(digger.pack, 'kobold');
  assert.equal(boss.pack, 'kobold', 'pull the boss, raise the dig');
  assert.ok(boss.special, 'the iron pick comes down — the telegraphed slam');
  assert.ok(digger.level < boss.level && digger.maxHp < boss.maxHp);
});

test('the loot-story law: each variant really drops the pick it swings', () => {
  const digger = LOOT_TABLES.get('kobold')!;
  const boss = LOOT_TABLES.get('kobold_digmaster')!;
  assert.ok(digger.entries.some((e) => e.item === 'bronze_pickaxe'));
  assert.ok(boss.entries.some((e) => e.item === 'iron_pickaxe'));
});

/** A recording 2D-context stand-in: counts calls, rejects NaN coords. */
function mockCtx(): CanvasRenderingContext2D & {
  fills: number;
  darkFills: number;
  waxFills: number;
} {
  const counter = {
    fills: 0,
    darkFills: 0,
    waxFills: 0,
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
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
        if (typeof target.fillStyle === 'string' && target.fillStyle.startsWith('#2')) {
          target.darkFills++;
        }
        if (target.fillStyle === '#e9dcc2') target.waxFills++;
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
    waxFills: number;
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

test('head and tail paint clean at all eight facings for every variant', () => {
  for (const kb of Object.values(KOBOLD_LOOKS) as KoboldLook[]) {
    for (const dir of FACINGS) {
      const ctx = mockCtx();
      paintKoboldHead(ctx, kb, headFrame(dir));
      assert.ok(ctx.fills > 4, 'the head is a built form, not a single block');
      paintKoboldTail(ctx, kb, tailFrame(dir));
      assert.ok(ctx.fills > 8, 'the tail is a ribbon with its ridge, not a stroke');
    }
  }
});

test('the face never shows from behind — but the candle always burns', () => {
  for (const kb of Object.values(KOBOLD_LOOKS) as KoboldLook[]) {
    const front = mockCtx();
    paintKoboldHead(front, kb, headFrame(Math.PI / 2)); // facing down-screen
    const back = mockCtx();
    paintKoboldHead(back, kb, headFrame(-Math.PI / 2)); // facing away
    // Facing the camera carries both bead pupils; from behind the head
    // is hide plates and nape — no face marks at all.
    assert.ok(front.darkFills >= 2, 'front band carries both pupils');
    assert.equal(back.darkFills, 0, 'back band shows hide plates, not a face');
    // The crown light rides the top of the head at EVERY facing.
    assert.ok(front.waxFills >= kb.candles, 'candles burn facing the camera');
    assert.ok(back.waxFills >= kb.candles, 'candles burn from behind too');
  }
});

test('the jaw yips through the strike beat', () => {
  const kb = KOBOLD_LOOKS['kobold_digmaster']!;
  const shut = mockCtx();
  paintKoboldHead(shut, kb, headFrame(Math.PI / 2, 0));
  const open = mockCtx();
  paintKoboldHead(open, kb, headFrame(Math.PI / 2, 1));
  assert.ok(open.fills > shut.fills, 'the gape opens the mouth and bares the teeth');
});
