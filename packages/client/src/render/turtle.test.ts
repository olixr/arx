/**
 * THE SHELL WALKS — turtle design laws. The colossus is a DESIGN,
 * never a scaled giant (its own palette, moss, more keel); the keep
 * out-hulls its own level band; the tame ladder gets its hardest
 * shell; the armored trailer TRAILS (the low-carriage BobtailSim dial
 * must never perk like a cat's stub); and every painter runs NaN-free
 * across all eight facing bands, live and collapsed (ragdoll
 * topScale).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, tameDef } from '@arx/content';
import {
  COLOSSUS_LOOK,
  TURTLE_LOOK,
  beastSpec,
  drawTurtleHead,
  paintTurtleBody,
} from './rig.js';
import { BobtailSim } from './tail.js';

test('the bestiary fields both turtles, keep and colossus', () => {
  const keep = NPCS.get('giant_turtle');
  const hill = NPCS.get('colossus_turtle');
  assert.ok(keep && hill);
  // Neutral fortresses: neither hunts anyone.
  assert.equal(keep.aggroRange, 0);
  assert.equal(hill.aggroRange, 0);
  // THE KEEP: out-hulls the bear two rungs above it.
  assert.ok(keep.maxHp > NPCS.get('bear')!.maxHp, 'the shell IS the stat');
  assert.ok(keep.level < NPCS.get('bear')!.level);
  // The slowest walkers in the wood — slower than anything that hunts.
  assert.ok(keep.speed < NPCS.get('bear')!.speed);
  assert.ok(hill.speed < keep.speed);
  // Cold blood under armor: nothing bleeds a shell; the chill finds it.
  assert.ok(keep.resist?.includes('bleed'));
  assert.ok(keep.weak?.includes('chill'));
  assert.ok(hill.resist?.includes('bleed'));
  assert.ok(hill.resist?.includes('venom'), 'ancient plate shrugs the fang');
  assert.ok(hill.weak?.includes('chill'));
  // Neither ever leaves the ground.
  assert.ok(!keep.pounce);
  assert.ok(!hill.pounce);
});

test('the tame ladder gets its hardest shell; the hill is never owned', () => {
  const row = tameDef('giant_turtle');
  assert.ok(row, 'the giant turtle answers a patient keeper');
  assert.equal(row.kit?.armor, 6, 'the last word in tanks');
  assert.equal(tameDef('colossus_turtle'), undefined, 'a hill is not owned');
});

test('designs, not reskins: the colossus owns its palette and its mass', () => {
  const keepTones = new Set([
    TURTLE_LOOK.shell,
    TURTLE_LOOK.rim,
    TURTLE_LOOK.skin,
    TURTLE_LOOK.beak,
    TURTLE_LOOK.eye,
  ]);
  for (const tone of [
    COLOSSUS_LOOK.shell,
    COLOSSUS_LOOK.rim,
    COLOSSUS_LOOK.skin,
    COLOSSUS_LOOK.beak,
    COLOSSUS_LOOK.eye,
  ]) {
    assert.ok(!keepTones.has(tone), `colossus shares keep tone ${tone}`);
  }
  // The years only the colossus wears.
  assert.ok(COLOSSUS_LOOK.moss, 'the moss saddles are the ancient read');
  assert.ok(COLOSSUS_LOOK.ancient);
  assert.ok(!TURTLE_LOOK.moss);
  // Out-hulled in every dial.
  assert.ok(COLOSSUS_LOOK.bodyW > TURTLE_LOOK.bodyW);
  assert.ok(COLOSSUS_LOOK.shellH > TURTLE_LOOK.shellH);
  assert.ok(COLOSSUS_LOOK.spikeH > TURTLE_LOOK.spikeH);
  assert.ok(COLOSSUS_LOOK.headW > TURTLE_LOOK.headW);
  const keepSpec = beastSpec('giant_turtle', 0.46, 2.2);
  const hillSpec = beastSpec('colossus_turtle', 0.62, 1.7);
  assert.ok(hillSpec.bodyLen > keepSpec.bodyLen);
  assert.ok(hillSpec.legW > keepSpec.legW);
  // THE COLUMNS: legs shorter than the shell is long, on the widest
  // relative track of any quadruped — pillars under a keep, splayed
  // from beneath the rim.
  for (const spec of [keepSpec, hillSpec]) {
    assert.ok(spec.rig.legLen < spec.bodyLen, 'pillar legs, never striders');
    assert.ok(spec.hipSide > 0.6, 'the columns splay from under the rim');
  }
  // Mass-law spoken: the colossus cadence is the slower of the two.
  assert.ok(hillSpec.rig.runSpeed < keepSpec.rig.runSpeed);
  assert.ok((hillSpec.rig.turnRate ?? Infinity) < (keepSpec.rig.turnRate ?? 0));
});

test('THE TAIL TRAILS THE KEEP: the low carriage never perks like a cat', () => {
  const settle = (standK: number): { tipZ: number; rootZ: number } => {
    const sim = new BobtailSim(1.5, 7, standK);
    for (let i = 0; i < 400; i++) {
      sim.update(0, 0, 0.15, 0, 1 / 60, i / 60, 1.15, 0);
    }
    const tip = sim.nodes[sim.nodes.length - 1]!;
    return { tipZ: tip.z, rootZ: sim.nodes[0]!.z };
  };
  const turtle = settle(0.3);
  const cat = settle(1);
  assert.ok(turtle.tipZ < cat.tipZ, 'the armored trailer hangs where the stub stands');
  assert.ok(
    turtle.tipZ < turtle.rootZ + 0.08,
    'the trailer stays at or below its stern root, never a perked flag',
  );
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

test('shell and head painters run clean across all eight facings, live and dead', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    const keepSpec = beastSpec('giant_turtle', 0.46, 2.2);
    const hillSpec = beastSpec('colossus_turtle', 0.62, 1.7);
    for (let band = 0; band < 8; band++) {
      const dir = (band / 8) * Math.PI * 2;
      const fx = Math.cos(dir);
      const fy = Math.sin(dir);
      for (const topScale of [undefined, 0.85]) {
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
        paintTurtleBody(mockCtx(), keepSpec, TURTLE_LOOK, frame);
        paintTurtleBody(mockCtx(), hillSpec, COLOSSUS_LOOK, frame);
        for (const gape of [0, 1]) {
          drawTurtleHead(mockCtx(), TURTLE_LOOK, {
            x: 100,
            y: 80,
            s: 48,
            fx,
            fy,
            ys: 0.6,
            gape,
            dead: topScale !== undefined,
          });
          drawTurtleHead(mockCtx(), COLOSSUS_LOOK, {
            x: 100,
            y: 80,
            s: 48,
            fx,
            fy,
            ys: 0.6,
            gape,
            dead: topScale !== undefined,
          });
        }
      }
    }
  } finally {
    g.Path2D = hadPath;
  }
});
