/**
 * THE STONE COURT — basilisk design laws. Three bodies, three
 * DESIGNS (fen lurker / basilisk / elder — never one silhouette at
 * three zooms); the six-legged sprawl walks the crab's alternating
 * tripod on its own foot word; the gaze line is the bestiary's
 * identity (licensed hold on both carriers, the fen gazeless); the
 * family's one tame door is the fen and the gaze obeys no leash;
 * wild coats scatter by seed (anti-twin) while the elder keeps one
 * geology; the fen feeds the banks and the gaze line keeps the dry
 * country; and body, head, and trailer painters run NaN-free across
 * all eight facing bands, live and collapsed, gaped and dead.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, tameDef, wildCandidates } from '@arx/content';
import {
  basiliskLook,
  beastSpec,
  drawBasiliskHead,
  paintBasiliskBody,
} from './rig.js';
import { TailSim, drawBasiliskTail } from './tail.js';

test('the bestiary fields the court: slow, armored, and the gaze is the law', () => {
  const fen = NPCS.get('fen_basilisk');
  const bas = NPCS.get('basilisk');
  const elder = NPCS.get('elder_basilisk');
  assert.ok(fen && bas && elder, 'all three bodies stand in the bestiary');
  // The sluggish metabolism of the lore: nothing in the court hurries.
  assert.ok(bas.speed < NPCS.get('wolf')!.speed, 'the basilisk never hurries');
  assert.ok(elder.speed <= bas.speed, 'the elder least of all');
  // Dracolisk hide out-hulls the shore's bulwark; the elder is a crag.
  assert.ok(bas.maxHp > NPCS.get('giant_crab')!.maxHp);
  assert.ok(elder.maxHp > bas.maxHp * 1.5);
  // Cold blood: winter's argument wins against every reptile here.
  for (const def of [fen, bas, elder]) assert.ok(def.weak?.includes('chill'));
  // THE GAZE: a licensed hold on BOTH carriers — and never the fen.
  const kitOf = (d: typeof bas): string[] => (d.kit ?? []).map((k) => k.ability);
  assert.ok(kitOf(bas).includes('stone_gaze'), 'the basilisk speaks the gaze');
  assert.ok(kitOf(elder).includes('stone_gaze'), 'the elder speaks it harder');
  assert.ok(!kitOf(fen).includes('stone_gaze'), 'the fen cousin is gazeless');
  assert.ok(kitOf(fen).includes('mire_spit'), 'the fen coughs up the swamp');
  assert.ok(kitOf(elder).includes('stone_mantle'), 'the elder turns the gaze inward');
  // A basilisk never pounces — the sprawl surges and the neck spends it.
  for (const def of [fen, bas, elder]) assert.ok(!def.pounce);
});

test('THE GAZE OBEYS NO LEASH: one tame door, and it is the fen', () => {
  const row = tameDef('fen_basilisk');
  assert.ok(row, 'the gazeless cousin answers a keeper');
  assert.equal(row.kit?.bite?.status, 'venom', 'the family drool rides the bite');
  // Keeled scale, a light shell rung — never a rung the crab crown feels.
  assert.ok((row.kit?.armor ?? 0) > 0);
  assert.ok((row.kit?.armor ?? 0) < (tameDef('giant_crab')?.kit?.armor ?? 0));
  // The stone-gaze line is refused by decree, forever.
  assert.equal(tameDef('basilisk'), undefined);
  assert.equal(tameDef('elder_basilisk'), undefined);
});

test('three designs, never one silhouette at three zooms', () => {
  const fen = beastSpec('fen_basilisk', 0.45, 2.3);
  const bas = beastSpec('basilisk', 0.5, 1.8);
  const elder = beastSpec('elder_basilisk', 0.62, 1.7);
  for (const spec of [fen, bas, elder]) {
    // THE SPRAWLED TRIPOD: six legs, the crab's proven alternating
    // groups, the court's own foot word, front knees bowed forward
    // over rear drivers hocked back.
    assert.equal(spec.rig.legs.length, 6);
    assert.deepEqual(spec.rig.legs.map((l) => l.group), [0, 1, 1, 0, 0, 1]);
    assert.equal(spec.foot, 'lizardclaw');
    assert.deepEqual(spec.kneeFwd, [1, 1, 1, -1, -1, -1]);
  }
  // The fork of the three bodies is SKELETAL, not a palette swap:
  // the lurker is the longest body on the lowest carriage; the elder
  // walks on columns.
  assert.ok(fen.bodyLen / fen.rig.rise > bas.bodyLen / bas.rig.rise, 'the fen is the log');
  assert.ok(elder.rig.legLen > bas.rig.legLen, 'the elder walks on columns');
  assert.ok(elder.legW > bas.legW * 1.3);
  const fenL = basiliskLook('fen_basilisk', 5);
  const basL = basiliskLook('basilisk', 5);
  const elderL = basiliskLook('elder_basilisk', 5);
  // The reads are owned: keel fin on the fen alone, the crown and
  // the years on the elder alone, and three different masses.
  assert.equal(fenL.fin, true);
  assert.ok(!basL.fin && !elderL.fin);
  assert.equal(elderL.elder, true);
  assert.ok(!basL.elder);
  assert.ok(elderL.bodyW > basL.bodyW && basL.bodyW > fenL.bodyW);
  assert.ok(elderL.ridgeH > basL.ridgeH && basL.ridgeH > fenL.ridgeH);
});

test('the coats scatter, the elder keeps one geology', () => {
  const hides = new Set<string>();
  for (let seed = 400; seed < 408; seed++) hides.add(basiliskLook('basilisk', seed).hide);
  assert.ok(hides.size >= 3, `wild coats scatter (got ${hides.size})`);
  const fenHides = new Set<string>();
  for (let seed = 400; seed < 408; seed++) fenHides.add(basiliskLook('fen_basilisk', seed).hide);
  assert.ok(fenHides.size >= 2, 'the marsh scatters too');
  const elders = new Set<string>();
  for (let seed = 400; seed < 408; seed++) elders.add(basiliskLook('elder_basilisk', seed).hide);
  assert.equal(elders.size, 1, 'a crag has exactly one geology');
});

test('the fen keeps the banks, the gaze line keeps the dry country', () => {
  // A bank at tier 3 by day: the fen lurker works the wet margin.
  const bank = wildCandidates(3, 'grass', 12, true).map((e) => e.npc);
  assert.ok(bank.includes('fen_basilisk'), 'the fen gate stands');
  // Away from water the lurker never wanders; the basilisk stands.
  const inland = wildCandidates(4, 'grass', 12, false).map((e) => e.npc);
  assert.ok(!inland.includes('fen_basilisk'));
  assert.ok(inland.includes('basilisk'), 'the stone court keeps the dry country');
  // The elder walks only the deep rungs.
  const shallow = wildCandidates(3, 'forest', 12, false).map((e) => e.npc);
  assert.ok(!shallow.includes('elder_basilisk'));
  const deep = wildCandidates(6, 'forest', 12, false).map((e) => e.npc);
  assert.ok(deep.includes('elder_basilisk'), 'the crag stands the deep dark');
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

test('the whole court paints clean: 8 bands, live and dead, gaped and doused', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    for (const [defId, radius, speed] of [
      ['fen_basilisk', 0.45, 2.3],
      ['basilisk', 0.5, 1.8],
      ['elder_basilisk', 0.62, 1.7],
    ] as const) {
      const spec = beastSpec(defId, radius, speed);
      const look = basiliskLook(defId, 7);
      for (let band = 0; band < 8; band++) {
        const dir = (band / 8) * Math.PI * 2;
        const fx = Math.cos(dir);
        const fy = Math.sin(dir);
        for (const topScale of [undefined, 0.62]) {
          paintBasiliskBody(mockCtx(), spec, look, {
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
          });
        }
        for (const gape of [0, 0.8]) {
          drawBasiliskHead(mockCtx(), look, {
            x: 100,
            y: 90,
            s: 48,
            fx,
            fy,
            ys: 0.6,
            gape,
            fen: look.fin,
          });
        }
        // The doused fire: the dead head at every band.
        drawBasiliskHead(mockCtx(), look, {
          x: 100,
          y: 90,
          s: 48,
          fx,
          fy,
          ys: 1,
          dead: true,
          fen: look.fin,
        });
      }
      // The hurt flash silhouette holds.
      paintBasiliskBody(mockCtx(), spec, look, {
        bx: 100,
        gy: 100,
        s: 48,
        fx: 1,
        fy: 0,
        ys: 0.6,
        seed: 5,
        hurt: true,
        bob: 0,
        roll: 0,
      });
      // THE DRAGON TRAILER: the live sim ticked through a stride and
      // painted NaN-free (plain path calls — no Path2D inside).
      const sim = new TailSim(look.tailHeavy, 7, spec.bodyLen - 0.05, 0.1, 0.3);
      for (let i = 0; i < 30; i++) {
        sim.update(i * 0.05, 0, look.bodyH * 0.45, 0, 1 / 60, i / 60, 1);
      }
      const pts = sim.nodes.map((nd) => ({ x: 100 + nd.x * 48, y: 100 - nd.z * 48 }));
      drawBasiliskTail(
        mockCtx(),
        pts,
        { hide: look.hide, horn: look.horn, heavy: look.tailHeavy * 0.72, fin: look.fin },
        48,
        { hurt: false, back: false },
      );
    }
  } finally {
    g.Path2D = hadPath;
  }
});
