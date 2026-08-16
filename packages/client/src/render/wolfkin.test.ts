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
  FAEWOLF_LOOK,
  WOLF_LOOK,
  WORG_LOOK,
  beastSpec,
  drawDireWolfHead,
  drawFaeWolfHead,
  drawWorgHead,
  paintDireWolfBody,
  paintFaeWolfBody,
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

test('THE COURT\'S HOUND: the fae wolf crowns the ladder', () => {
  const fae = NPCS.get('fae_wolf');
  const dire = NPCS.get('dire_wolf');
  const worg = NPCS.get('worg');
  assert.ok(fae && dire && worg);
  // The highest rung: above the matriarch in level, body, and reach.
  assert.ok(fae.level > dire.level, 'the hound outranks the matriarch');
  assert.ok(fae.maxHp > dire.maxHp);
  assert.ok(fae.xpReward > dire.xpReward);
  // Only the court's hound outpaces a worg.
  assert.ok(fae.speed > worg.speed, 'the legend is the speed');
  // The smartest hunter: widest mark, widest watch.
  assert.ok(fae.aggroRange > dire.aggroRange);
  assert.ok((fae.sightArc ?? 0) > (dire.sightArc ?? 0));
  // It runs the wolfkin web (the rally answers it) and bites cold.
  assert.equal(fae.pack, 'wolfkin');
  assert.equal(fae.attackStatus?.status, 'chill');
  assert.ok(fae.pounce);
  // The three words, in the authored order: fence, shove, close.
  assert.deepEqual(
    fae.kit?.map((k) => k.ability),
    ['faerie_ring', 'gloaming_veil', 'glimmer_step'],
  );
  // The court's own cold cannot bite the court's hound.
  assert.ok(fae.resist?.includes('chill'));
  assert.ok(fae.weak?.includes('burn'));
});

test('the hound is a design, never a scaled dire: tall, fine-boned, disjoint palette', () => {
  // No tone shared with the wolf OR the matriarch — the fae wolf
  // arrives from the court, not from the pack's paint pots.
  const kinTones = new Set([
    WOLF_LOOK.coat, WOLF_LOOK.saddle, WOLF_LOOK.under, WOLF_LOOK.eye,
    DIREWOLF_LOOK.coat, DIREWOLF_LOOK.saddle, DIREWOLF_LOOK.under, DIREWOLF_LOOK.eye,
  ]);
  for (const tone of [FAEWOLF_LOOK.coat, FAEWOLF_LOOK.mantle, FAEWOLF_LOOK.under, FAEWOLF_LOOK.eye, FAEWOLF_LOOK.glimmer]) {
    assert.ok(!kinTones.has(tone), `fae wolf shares a wolfkin tone ${tone}`);
  }
  const direSpec = beastSpec('dire_wolf', 0.44, 4.8);
  const faeSpec = beastSpec('fae_wolf', 0.47, 5.2);
  // THE TOWER ON STILTS: the longest legs and the biggest frame in
  // the canid line, on a HIGHER topline than the matriarch's —
  assert.ok(faeSpec.rig.legLen > direSpec.rig.legLen, 'the longest canid legs in the wood');
  assert.ok(faeSpec.bodyLen > direSpec.bodyLen);
  assert.ok(FAEWOLF_LOOK.backH > DIREWOLF_LOOK.backH);
  // — but FINE-BONED: a narrower skull and slimmer legs than hers.
  // Height without bulk is the whole architecture.
  assert.ok(FAEWOLF_LOOK.headW < DIREWOLF_LOOK.headW, 'the hound is fine-boned, never a bone-crusher');
  assert.ok(faeSpec.legW < direSpec.legW);
  // The sight-hound tuck: the deepest chest-to-waist sweep in the line.
  assert.ok(
    FAEWOLF_LOOK.tuckH - FAEWOLF_LOOK.chestH > DIREWOLF_LOOK.tuckH - DIREWOLF_LOOK.chestH,
    'the gazehound tuck must out-sweep the matriarch',
  );
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
    const faeSpec = beastSpec('fae_wolf', 0.47, 5.2);
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
        paintFaeWolfBody(mockCtx(), faeSpec, FAEWOLF_LOOK, frame);
        // The hurt flash keeps the glimmer signature — walk it too.
        paintFaeWolfBody(mockCtx(), faeSpec, FAEWOLF_LOOK, { ...frame, hurt: true });
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
        // The court's hound: chamfron, tines, gorget gem, glow eyes,
        // snarl breath — every station must project finite at every
        // band, live and dead (the silver survives the corpse).
        drawFaeWolfHead(mockCtx(), FAEWOLF_LOOK, {
          x: 100,
          y: 80,
          s: 48,
          fx,
          fy,
          ys: 0.82,
          dead,
          snarl: dead ? 0 : 0.8,
        });
      }
    }
  } finally {
    g.Path2D = hadPath as typeof Path2D;
  }
});
