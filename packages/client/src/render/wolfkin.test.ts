/**
 * Wolfkin design laws: the dire wolf and the worg are DESIGNS, never
 * reskins — each owns its palette (no tone shared with the wolf), the
 * matriarch out-masses the wolf in every dimension while the worg
 * carries the hyena slope (withers towering over the rump), and both
 * body/head painters run NaN-free across all eight facing bands, live
 * and collapsed (ragdoll topScale).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, PACK_RALLY_RANGE } from '@arx/content';
import {
  DIREWOLF_LOOK,
  WOLF_LOOK,
  WORG_LOOK,
  beastSpec,
  drawDireWolfHead,
  drawWorgHead,
  paintDireWolfBody,
  paintWorgBody,
} from './rig.js';

test('the bestiary fields both wolfkin, packed and armed', () => {
  const dire = NPCS.get('dire_wolf');
  const worg = NPCS.get('worg');
  const wolf = NPCS.get('wolf');
  assert.ok(dire && worg && wolf);
  // The matriarch is the champion of the ladder: above wolf and bear.
  assert.ok(dire.level > NPCS.get('bear')!.level);
  assert.ok(dire.maxHp > wolf.maxHp * 2);
  // She runs with her pack and calls it mid-fight.
  assert.equal(dire.pack, 'wolfkin');
  assert.equal(wolf.pack, 'wolfkin');
  assert.equal(dire.kit?.[0]?.ability, 'rallying_howl');
  assert.ok(PACK_RALLY_RANGE > 0);
  // The worg is its own line: bonded pairs, hamstring bite, pounce.
  assert.equal(worg.pack, 'worg');
  assert.equal(worg.attackStatus?.status, 'chill');
  assert.ok(worg.pounce);
  assert.ok(worg.speed > wolf.speed, 'you do not outrun a worg');
});

test('designs, not reskins: no palette entry shared with the wolf', () => {
  const wolfTones = new Set([WOLF_LOOK.coat, WOLF_LOOK.saddle, WOLF_LOOK.under, WOLF_LOOK.eye]);
  for (const tone of [DIREWOLF_LOOK.coat, DIREWOLF_LOOK.saddle, DIREWOLF_LOOK.under, DIREWOLF_LOOK.eye]) {
    assert.ok(!wolfTones.has(tone), `dire wolf shares wolf tone ${tone}`);
  }
  for (const tone of [WORG_LOOK.hide, WORG_LOOK.mane, WORG_LOOK.bare, WORG_LOOK.eye]) {
    assert.ok(!wolfTones.has(tone), `worg shares wolf tone ${tone}`);
  }
  // The matriarch out-masses the wolf everywhere it counts.
  assert.ok(DIREWOLF_LOOK.bodyW > WOLF_LOOK.bodyW);
  assert.ok(DIREWOLF_LOOK.backH > WOLF_LOOK.backH);
  assert.ok(DIREWOLF_LOOK.headW > WOLF_LOOK.headW);
  const wolfSpec = beastSpec('wolf', 0.34, 4.6);
  const direSpec = beastSpec('dire_wolf', 0.44, 4.8);
  const worgSpec = beastSpec('worg', 0.37, 5.0);
  assert.ok(direSpec.bodyLen > wolfSpec.bodyLen);
  assert.ok(direSpec.rig.legLen > wolfSpec.rig.legLen);
  // The worg's slope is real: withers tower over the rump.
  assert.ok(WORG_LOOK.shoulderH > WORG_LOOK.rumpH * 1.6, 'the hyena slope must read');
  assert.ok(worgSpec.bodyLen > wolfSpec.bodyLen, 'the worg is bigger than a wolf');
  assert.ok(direSpec.bodyLen > worgSpec.bodyLen, 'the matriarch out-masses the worg');
});

/** Minimal Path2D stand-in: records numbers, rejects NaN geometry. */
class FakePath2D {
  constructor(other?: FakePath2D) {
    void other;
  }
  moveTo(...args: number[]): void {
    check(args);
  }
  lineTo(...args: number[]): void {
    check(args);
  }
  closePath(): void {}
  addPath(): void {}
}

function check(args: unknown[]): void {
  for (const a of args) {
    if (typeof a === 'number') assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
  }
}

/** A recording 2D-context stand-in: rejects NaN coords everywhere. */
function mockCtx(): CanvasRenderingContext2D {
  const state = {
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  return new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      return (...args: unknown[]) => check(args);
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

test('both painters run clean across all eight facings, live and dead', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    const direSpec = beastSpec('dire_wolf', 0.44, 4.8);
    const worgSpec = beastSpec('worg', 0.37, 5.0);
    for (let band = 0; band < 8; band++) {
      const dir = (band / 8) * Math.PI * 2;
      const fx = Math.cos(dir);
      const fy = Math.sin(dir);
      for (const topScale of [undefined, 0.5]) {
        const frame = {
          bx: 100,
          gy: 100,
          s: 48,
          fx,
          fy,
          ys: topScale === undefined ? 0.82 : 1,
          seed: 1234 + band,
          hurt: false,
          bob: 0,
          roll: 0,
          topScale,
          botH: topScale === undefined ? undefined : 0.02,
        };
        paintDireWolfBody(mockCtx(), direSpec, DIREWOLF_LOOK, frame);
        paintWorgBody(mockCtx(), worgSpec, WORG_LOOK, frame);
      }
      for (const dead of [false, true]) {
        drawDireWolfHead(mockCtx(), DIREWOLF_LOOK, {
          x: 100,
          y: 80,
          s: 48,
          fx,
          fy,
          ys: 0.82,
          dead,
          snarl: dead ? 0 : 0.8,
          // No flick lever anymore: the ears are a SIMULATION, and a
          // sim-less call paints THE ONE REST — exactly what this
          // NaN-sweep should walk.
        });
        drawWorgHead(mockCtx(), WORG_LOOK, {
          x: 100,
          y: 80,
          s: 48,
          fx,
          fy,
          ys: 0.82,
          dead,
          gape: dead ? 0 : 0.8,
          flick: 0.5,
        });
      }
    }
  } finally {
    g.Path2D = hadPath as typeof Path2D;
  }
});
