/**
 * THE TIDE'S RAMPART — giant crab design laws. The bulwark is a
 * DESIGN, never a scaled mudcrab (no shared tone, own plate mail,
 * own foot word, own jointed arms); the tank identity is the stat
 * line; the tame ladder's shell crown climbs beetle < keep < bulwark
 * and the grip runs deeper than the pinch; the shore roster feeds
 * the banks and never the meadows; and the whole-animal painter runs
 * NaN-free across all eight facing bands, live and collapsed, with
 * the eye stalks on the live sim AND on the stateless ONE REST.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, tameDef, wildCandidates } from '@arx/content';
import {
  CRAB_LOOK,
  GIANTCRAB_LOOK,
  beastSpec,
  paintGiantCrabBody,
} from './rig.js';
import { EarSim } from './earPhysics.js';

test('the bestiary fields the bulwark: fierce where the keeps are patient', () => {
  const crab = NPCS.get('giant_crab');
  assert.ok(crab, 'the giant crab stands in the bestiary');
  // Territorial, not passive — the one armored body that comes to you.
  assert.ok(crab.aggroRange > 0, 'the bank is claimed and enforced');
  // THE BULWARK: more hull than the keep below it and the bear beside it.
  assert.ok(crab.maxHp > NPCS.get('giant_turtle')!.maxHp);
  assert.ok(crab.maxHp > NPCS.get('bear')!.maxHp);
  // Heavy machinery: slower than anything that hunts, quicker than a hill.
  assert.ok(crab.speed < NPCS.get('bear')!.speed);
  assert.ok(crab.speed > NPCS.get('colossus_turtle')!.speed);
  // Cold water armor: the edge and the chill both fail; the storm wins.
  assert.ok(crab.resist?.includes('bleed'));
  assert.ok(crab.resist?.includes('chill'));
  assert.ok(crab.weak?.includes('shock'));
  // THE GRIP: even the basic pinch holds cold.
  assert.equal(crab.attackStatus?.status, 'chill');
  // The two words: the clamp and the jet, on the kit rail.
  const kit = (crab.kit ?? []).map((k) => k.ability);
  assert.ok(kit.includes('breakwater_grip'), 'the clamp is spoken');
  assert.ok(kit.includes('brine_jet'), 'the jet is spoken');
  // A crab never pounces — the hull plants and the claw spends the strike.
  assert.ok(!crab.pounce);
});

test('the shell crown: the ladder climbs and the grip runs deeper', () => {
  const row = tameDef('giant_crab');
  assert.ok(row, 'the bulwark answers a deep keeper');
  assert.equal(row.kit?.armor, 7, 'the crown of the shell ladder');
  assert.ok(
    (row.kit?.armor ?? 0) > (tameDef('giant_turtle')?.kit?.armor ?? 0),
    'the bulwark out-shells the keep',
  );
  assert.equal(row.kit?.bite?.status, 'chill');
  assert.ok(
    (row.kit?.bite?.power ?? 0) > (tameDef('mudcrab')?.kit?.bite?.power ?? 0),
    'the great claw grips one weight past the pinch',
  );
});

test('a design, never a reskin: the bulwark shares nothing with the mudcrab', () => {
  const pebble = new Set([CRAB_LOOK.shell, CRAB_LOOK.claw, CRAB_LOOK.eye]);
  for (const tone of [
    GIANTCRAB_LOOK.shell,
    GIANTCRAB_LOOK.crest,
    GIANTCRAB_LOOK.claw,
    GIANTCRAB_LOOK.clawTip,
    GIANTCRAB_LOOK.eye,
  ]) {
    assert.ok(!pebble.has(tone), `bulwark shares mudcrab tone ${tone}`);
  }
  const giant = beastSpec('giant_crab', 0.5, 1.9);
  const mud = beastSpec('mudcrab', 0.24, 2.2);
  // The crab law both bodies keep: wider than long.
  assert.ok(GIANTCRAB_LOOK.bodyW > giant.bodyLen);
  assert.ok(CRAB_LOOK.bodyW > mud.bodyLen);
  // THE STILT MARCH: six legs, own foot word, and real daylight where
  // the mudcrab squats — taller legs, higher hips, wider track.
  assert.equal(giant.rig.legs.length, 6);
  assert.equal(giant.foot, 'crabspike');
  assert.notEqual(giant.foot, mud.foot);
  assert.ok(giant.rig.legLen > mud.rig.legLen * 2, 'stilts, never squat pegs');
  assert.ok(giant.rig.rise > mud.rig.rise * 2, 'daylight under the hull');
  assert.ok(giant.hipSide > 0.7, 'the widest tall track in the game');
  // Alternating tripods — the insect gait law.
  const groups = giant.rig.legs.map((l) => l.group);
  assert.deepEqual(groups, [0, 1, 1, 0, 0, 1]);
});

test('THE TIDE LINE: shore kinds muster on banks and never inland', () => {
  // A bank at tier 2 by day: the meadow roster PLUS the mudcrabs.
  const bank = wildCandidates(2, 'grass', 12, true).map((e) => e.npc);
  assert.ok(bank.includes('mudcrab'), 'the shore finally feeds');
  // The same meadow away from water: no crab ever wanders inland.
  const inland = wildCandidates(2, 'grass', 12, false).map((e) => e.npc);
  assert.ok(!inland.includes('mudcrab'));
  assert.ok(!inland.includes('giant_crab'));
  // The bulwark stands the deeper banks.
  const deepBank = wildCandidates(4, 'grass', 12, true).map((e) => e.npc);
  assert.ok(deepBank.includes('giant_crab'), 'the rampart stands its bank');
  // And the shore flag never REPLACES the meadow — bank life includes
  // the ordinary roster too.
  for (const npc of inland) assert.ok(bank.includes(npc), `${npc} still grazes the bank`);
});

function check(args: unknown[]): void {
  for (const a of args) {
    if (typeof a === 'number') assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
  }
}

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

test('the whole animal paints clean: 8 bands, live and dead, coiled and clamped', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    const spec = beastSpec('giant_crab', 0.5, 1.9);
    const eyes = new EarSim(7);
    for (let band = 0; band < 8; band++) {
      const dir = (band / 8) * Math.PI * 2;
      const fx = Math.cos(dir);
      const fy = Math.sin(dir);
      for (const topScale of [undefined, 0.6]) {
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
        for (const at of [0, 0.5, 0.9]) {
          // The stateless ONE REST stalks...
          paintGiantCrabBody(mockCtx(), spec, GIANTCRAB_LOOK, frame, at, band * 120);
          // ...and the live sim, ticked through the same beats.
          paintGiantCrabBody(mockCtx(), spec, GIANTCRAB_LOOK, frame, at, band * 120, eyes);
        }
      }
    }
    // The hurt flash silhouette holds too.
    paintGiantCrabBody(
      mockCtx(),
      spec,
      GIANTCRAB_LOOK,
      { bx: 100, gy: 100, s: 48, fx: 1, fy: 0, ys: 0.6, seed: 5, hurt: true, bob: 0, roll: 0 },
      0.8,
      500,
    );
  } finally {
    g.Path2D = hadPath;
  }
});
