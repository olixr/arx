/**
 * THE RAZORBACK RECAST — boar design laws. The dire boar is a DESIGN,
 * never a scaled boar (its own cold-iron palette, the fourfold jaw,
 * the war-record scars, the frost-tipped quill hedge); the pair share
 * one charge verb (pounce) and the tame ladder's hardest shove ends
 * at the truffle; and every painter runs NaN-free across all eight
 * facing bands, live and collapsed (ragdoll topScale), charging and
 * calm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, tameDef } from '@arx/content';
import { BOAR_LOOK, DIREBOAR_LOOK, beastSpec, drawBoarHead, paintBoarBody } from './rig.js';

test('the bestiary fields both boars, rooter and razorback', () => {
  const boar = NPCS.get('boar');
  const dire = NPCS.get('dire_boar');
  assert.ok(boar && dire);
  // The rooter minds its business until crossed; the razorback hunts.
  assert.equal(boar.aggroRange, 0);
  assert.ok(dire.aggroRange > 0, 'the old razorback charges first');
  // Both bodies own THE CHARGE — the leaping gore is the species verb.
  assert.ok(boar.pounce);
  assert.ok(dire.pounce);
  // The tusks open what the charge knocks down.
  assert.equal(dire.attackStatus?.status, 'bleed');
  // The razorback outpaces its little cousin — a charge, not a trot.
  assert.ok(dire.speed > boar.speed);
  // It seats between the bear and the dire wolf on the ladder.
  assert.ok(dire.level > NPCS.get('bear')!.level);
  assert.ok(dire.level < NPCS.get('dire_wolf')!.level);
});

test('the tame ladder ends at the truffle: the hardest shove walks behind you', () => {
  const boar = tameDef('boar');
  const dire = tameDef('dire_boar');
  assert.ok(boar && dire, 'both boars answer a keeper — the pets players asked for');
  assert.ok((dire.kit?.knockback ?? 0) > (boar.kit?.knockback ?? 0), 'the wagon out-shoves the cart');
  assert.equal(dire.lure, 'truffle', 'it answers to exactly one thing, and it grows underground');
});

test('designs, not reskins: the razorback owns its palette and its jaw', () => {
  const boarTones = new Set([
    BOAR_LOOK.hide,
    BOAR_LOOK.bristle,
    BOAR_LOOK.quillTip,
    BOAR_LOOK.snout,
    BOAR_LOOK.tusk,
    BOAR_LOOK.eye,
  ]);
  for (const tone of [
    DIREBOAR_LOOK.hide,
    DIREBOAR_LOOK.bristle,
    DIREBOAR_LOOK.quillTip,
    DIREBOAR_LOOK.snout,
    DIREBOAR_LOOK.tusk,
    DIREBOAR_LOOK.eye,
  ]) {
    assert.ok(!boarTones.has(tone), `dire boar shares boar tone ${tone}`);
  }
  // The reads only the razorback wears.
  assert.ok(DIREBOAR_LOOK.fourTusk, 'the fourfold jaw');
  assert.ok(DIREBOAR_LOOK.scar, 'the war record');
  assert.ok(DIREBOAR_LOOK.jowl, 'the old bruiser face');
  assert.ok(!BOAR_LOOK.fourTusk && !BOAR_LOOK.scar && !BOAR_LOOK.jowl);
  // Out-massed in every dial that carries the silhouette.
  assert.ok(DIREBOAR_LOOK.bodyW > BOAR_LOOK.bodyW);
  assert.ok(DIREBOAR_LOOK.humpH > BOAR_LOOK.humpH, 'the mountain at the shoulder');
  assert.ok(DIREBOAR_LOOK.crestH > BOAR_LOOK.crestH, 'the taller hedge');
  assert.ok(DIREBOAR_LOOK.tuskLen > BOAR_LOOK.tuskLen);
  assert.ok(DIREBOAR_LOOK.tailK > BOAR_LOOK.tailK, 'the longer rope');
  const boarSpec = beastSpec('boar', 0.3, 3.8);
  const direSpec = beastSpec('dire_boar', 0.45, 4.2);
  assert.ok(direSpec.bodyLen > boarSpec.bodyLen);
  assert.ok(direSpec.legW > boarSpec.legW);
  assert.ok(direSpec.rig.legLen > boarSpec.rig.legLen, 'longer bones, never a stretched pig');
  assert.ok(direSpec.segSplit, 'the razorback splits long forearm over short cannon');
  // Both charge on cloven horn.
  assert.equal(boarSpec.foot, 'hoof');
  assert.equal(direSpec.foot, 'hoof');
});

test('THE RAZOR HUMP: both toplines tower at the shoulder and fall to a lean stern', () => {
  // The hump law lives in the painter's topline curve; pin its shape
  // through the look dials — the tower must clear the stern by real
  // margin on both bodies, and the dire's margin must be the greater.
  const slope = (look: typeof BOAR_LOOK): number => (look.backH + look.humpH) / look.backH;
  assert.ok(slope(BOAR_LOOK) > 1.3, 'the boar is a wedge, not a pig');
  assert.ok(slope(DIREBOAR_LOOK) > slope(BOAR_LOOK), 'the dire hump is the mountain');
  // The streamlined undercarriage: deep chest, tucked stern.
  assert.ok(BOAR_LOOK.tuckH > BOAR_LOOK.chestH);
  assert.ok(DIREBOAR_LOOK.tuckH > DIREBOAR_LOOK.chestH);
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
  quadraticCurveTo(...args: number[]): void {
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

test('body and head painters run clean across all eight facings, live, charging, and dead', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    const boarSpec = beastSpec('boar', 0.3, 3.8);
    const direSpec = beastSpec('dire_boar', 0.45, 4.2);
    for (let band = 0; band < 8; band++) {
      const dir = (band / 8) * Math.PI * 2;
      const fx = Math.cos(dir);
      const fy = Math.sin(dir);
      for (const topScale of [undefined, 0.55]) {
        const frame = {
          bx: 100,
          gy: 100,
          s: 48,
          fx,
          fy,
          ys: topScale === undefined ? 0.6 : 1,
          seed: 1234 + band,
          hurt: false,
          bob: 0,
          roll: 0,
          ...(topScale !== undefined ? { topScale, botH: 0.02 } : {}),
        };
        for (const hackle of [0, 1]) {
          paintBoarBody(mockCtx(), boarSpec, BOAR_LOOK, frame, hackle);
          paintBoarBody(mockCtx(), direSpec, DIREBOAR_LOOK, frame, hackle);
        }
        for (const charge of [0, 1]) {
          drawBoarHead(mockCtx(), BOAR_LOOK, {
            x: 100,
            y: 80,
            s: 48,
            fx,
            fy,
            ys: 0.6,
            charge,
            seed: 1234 + band,
            dead: topScale !== undefined,
          });
          drawBoarHead(mockCtx(), DIREBOAR_LOOK, {
            x: 100,
            y: 80,
            s: 48,
            fx,
            fy,
            ys: 0.6,
            charge,
            seed: 1234 + band,
            dead: topScale !== undefined,
          });
        }
      }
    }
  } finally {
    g.Path2D = hadPath;
  }
});
