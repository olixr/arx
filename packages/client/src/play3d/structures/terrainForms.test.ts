import test from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { DOCK_LIFT } from '../../render/terrain.js';
import { ELEV_H } from '../../render/elevPick.js';
import { buildHeightfield, collectStepFaces, type StepFace } from '../heightfield.js';
import {
  CLIFF_PERIOD,
  browOf,
  cliffVariant,
  crossCoord,
  mergeStepFaces,
  runCoord,
  stripOf,
  stripU,
} from './cliffFaces.js';
import {
  JOIST_H,
  PILE_DRIVE,
  apronLift,
  deckLiftAt,
  deckStripU,
  deckStripVariant,
  pilePlaneRow,
  planDeckTile,
  porchArm,
} from './deckFaces.js';
import { gridSampler } from './structKinds.js';

const G = Tile.Grass;
const W = Tile.Water;
const D = Tile.Dock;
const B = Tile.Bridge;
const P = Tile.PorchDeck;
const C = Tile.Cliff;
const R = Tile.Ramp;
const WS = Tile.WallStone;
const RW = Tile.RailWood;

// -------------------------------------------------- the step faces

/** A deterministic hash for a pseudo-random level field. */
function levelField(seed: number): (tx: number, ty: number) => number {
  return (tx, ty) => {
    let h = (seed ^ Math.imul(tx | 0, 0x9e3779b1) ^ Math.imul(ty | 0, 0x85ebca6b)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return ((h >>> 16) % 4) - 1; // -1..2
  };
}

test('collectStepFaces lists exactly the faces buildHeightfield emits', () => {
  for (const seed of [1, 7, 42]) {
    const levelAt = levelField(seed);
    const isRamp = (tx: number, ty: number): boolean => (tx * 7 + ty * 3) % 11 === 0;
    const inp = { cx: -2, cy: 3, size: 8, levelAt, isRamp, levelH: ELEV_H, px: 24, gutter: 4 };
    const mesh = buildHeightfield(inp);
    const faces = collectStepFaces(inp);
    assert.equal(faces.length, mesh.faceCount, `seed ${seed}`);
    for (const f of faces) {
      assert.ok(f.levels >= 1);
      assert.ok(Math.max(f.yTopA, f.yTopB) > Math.min(f.yBotA, f.yBotB));
      // a→b runs W→E for N/S faces, N→S for E/W faces.
      if (f.side === 'N' || f.side === 'S') assert.equal(f.bx - f.ax, 1);
      else assert.equal(f.bz - f.az, 1);
    }
  }
});

test('a plateau tile owns its four faces with the drop in levels', () => {
  const levelAt = (tx: number, ty: number): number => (tx === 1 && ty === 1 ? 2 : 0);
  const faces = collectStepFaces({ cx: 0, cy: 0, size: 3, levelAt, isRamp: () => false, levelH: ELEV_H });
  assert.equal(faces.length, 4);
  assert.deepEqual(new Set(faces.map((f) => f.side)), new Set(['N', 'E', 'S', 'W']));
  for (const f of faces) {
    assert.equal(f.levels, 2);
    assert.equal(f.tx, 1);
    assert.equal(f.ty, 1);
    assert.equal(f.yTopA, 2 * ELEV_H);
    assert.equal(f.yBotA, 0);
  }
  const south = faces.find((f) => f.side === 'S')!;
  assert.deepEqual([south.ax, south.az, south.bx, south.bz, south.nx, south.nz], [1, 2, 2, 2, 0, 1]);
});

// ------------------------------------------------------ cliff runs

function flatFace(side: StepFace['side'], tx: number, ty: number, levels = 1): StepFace {
  const along = side === 'N' || side === 'S';
  const az = side === 'S' ? ty + 1 : ty;
  const ax = side === 'E' ? tx + 1 : tx;
  return {
    tx,
    ty,
    side,
    ax,
    az,
    bx: along ? ax + 1 : ax,
    bz: along ? az : az + 1,
    yTopA: levels * ELEV_H,
    yTopB: levels * ELEV_H,
    yBotA: 0,
    yBotB: 0,
    nx: side === 'E' ? 1 : side === 'W' ? -1 : 0,
    nz: side === 'S' ? 1 : side === 'N' ? -1 : 0,
    levels,
  };
}

test('strip maths wrap negative coordinates and stay inside the period', () => {
  assert.equal(stripU(0), 0);
  assert.equal(stripU(1), 0.25);
  assert.equal(stripU(-1), 0.75);
  assert.equal(stripU(-4), 0);
  assert.equal(stripOf(-1), -1);
  assert.equal(stripOf(4), 1);
  assert.equal(CLIFF_PERIOD, 4);
  assert.equal(deckStripU(-3), 0.25);
  for (let i = 0; i < 20; i++) assert.ok(cliffVariant(i - 10, 3, 1) >= 0 && cliffVariant(i - 10, 3, 1) < 3);
});

test('a straight south rim merges into one run per strip, ends marked exposed', () => {
  const faces = [0, 1, 2, 3, 4, 5].map((x) => flatFace('S', x, 2));
  const runs = mergeStepFaces(faces, () => 'turf');
  // x 0..3 is strip 0, x 4..5 strip 1.
  assert.equal(runs.length, 2);
  const [r0, r1] = runs.sort((p, q) => p.a - q.a);
  assert.deepEqual([r0!.a, r0!.b, r0!.strip, r0!.contA, r0!.contB], [0, 4, 0, false, true]);
  assert.deepEqual([r1!.a, r1!.b, r1!.strip, r1!.contA, r1!.contB], [4, 6, 1, true, false]);
  assert.equal(r0!.cross, 3);
  assert.equal(r0!.side, 'S');
});

test('runs split on a brow change and on a level change; a sloped skirt stays alone', () => {
  const faces = [flatFace('S', 0, 0), flatFace('S', 1, 0), flatFace('S', 2, 0, 2), flatFace('S', 3, 0, 2)];
  const runs = mergeStepFaces(faces, (f) => (f.tx === 1 ? 'bare' : 'turf'));
  assert.equal(runs.length, 3);
  const skirt = flatFace('E', 5, 5);
  skirt.yTopB = 0.5;
  const solo = mergeStepFaces([skirt, flatFace('E', 5, 6)], () => 'bare');
  assert.equal(solo.length, 2);
  assert.equal(runCoord(skirt), 5);
  assert.equal(crossCoord(skirt), 6);
});

test('the brow steps inward past the Cliff rim strip to what tops the plateau', () => {
  const grid = [
    [G, G, G],
    [C, C, C],
    [G, G, G],
  ];
  const s = gridSampler(grid);
  const south = flatFace('S', 1, 1);
  assert.equal(browOf(s, south), 'turf');
  const bare = gridSampler([
    [Tile.Dirt, Tile.Dirt, Tile.Dirt],
    [C, C, C],
    [G, G, G],
  ]);
  assert.equal(browOf(bare, south), 'bare');
  // A ramp's own skirt is bare rock.
  assert.equal(browOf(gridSampler([[R]]), flatFace('E', 0, 0)), 'bare');
});

// ------------------------------------------------------------ decks

/** A ground sampler over a grid: undefined off the grid. */
function groundOf(rows: number[][], ox = 0, oy = 0): (tx: number, ty: number) => number | undefined {
  const s = gridSampler(rows, { ox, oy });
  return (tx, ty) => s.groundAt(tx, ty);
}

test('a jetty over water lifts; a corduroy road on dry land does not', () => {
  // A 4-long dock from the west bank out over water, 2 tiles of water each side.
  const jetty = [
    [G, W, W, W, W, W, W],
    [G, W, W, W, W, W, W],
    [G, D, D, D, D, W, W],
    [G, W, W, W, W, W, W],
    [G, W, W, W, W, W, W],
  ];
  // THE MEMO IS WORLD-KEYED (terrain.ts deckStructureLifted, 5 s flush):
  // every grid here lives in its own world region so verdicts never
  // bleed between tests.
  const g = groundOf(jetty, 100, 100);
  const root = planDeckTile(g, 101, 102)!;
  assert.ok(root);
  assert.equal(root.family, 'dock');
  assert.deepEqual([root.hasW, root.hasE, root.hasN, root.hasS], [false, true, false, false]);
  assert.ok(root.landW && !root.waterW);
  assert.ok(root.waterS && root.waterN);
  const head = planDeckTile(g, 104, 102)!;
  assert.deepEqual([head.hasW, head.hasE], [true, false]);
  assert.ok(head.waterE);
  assert.equal(head.apron, 'none');
  const dry = [
    [G, G, G, G],
    [D, D, D, D],
    [G, G, G, G],
  ];
  assert.equal(planDeckTile(groundOf(dry, 200, 200), 201, 201), null);
  assert.equal(deckLiftAt(groundOf(dry, 200, 200), 201.5, 201.5), 0);
  assert.equal(deckLiftAt(g, 102.5, 102.5), DOCK_LIFT);
  assert.equal(deckLiftAt(g, 100.5, 102.5), 0);
});

test('a bridge across a brook: aprons pour onto the banks and the lift interpolates', () => {
  // Land west and east, water column in the middle; walk runs E-W.
  const rows = [
    [G, G, W, W, W, G, G],
    [G, B, B, B, B, B, G],
    [G, B, B, B, B, B, G],
    [G, G, W, W, W, G, G],
  ];
  const g = groundOf(rows, 300, 300);
  const west = planDeckTile(g, 301, 301)!;
  assert.equal(west.family, 'bridge');
  assert.equal(west.vertRun, false);
  assert.equal(west.apron, 'W');
  const mid = planDeckTile(g, 303, 301)!;
  assert.equal(mid.apron, 'none');
  assert.ok(mid.waterN && !mid.hasN);
  const east = planDeckTile(g, 305, 302)!;
  assert.equal(east.apron, 'E');
  // The west apron rises from grade at its land edge to full lift at the deck edge.
  assert.equal(apronLift('W', 0, 0.5), 0);
  assert.equal(apronLift('W', 1, 0.5), DOCK_LIFT);
  assert.ok(Math.abs(deckLiftAt(g, 301.25, 301.5) - DOCK_LIFT * 0.25) < 1e-9);
  assert.ok(Math.abs(deckLiftAt(g, 305.75, 302.5) - DOCK_LIFT * 0.25) < 1e-9);
  assert.equal(deckLiftAt(g, 303.5, 301.5), DOCK_LIFT);
  assert.equal(apronLift('none', 0.3, 0.3), DOCK_LIFT);
  assert.equal(apronLift('N', 0.3, 0.5), DOCK_LIFT * 0.5);
  assert.equal(apronLift('S', 0.3, 0.25), DOCK_LIFT * 0.75);
});

test('a porch ashore: carried tiles keep their decking, the tread opens south, the wall north is skipped', () => {
  const rows = [
    [WS, WS, WS, WS, WS],
    [G, P, RW, P, G],
    [G, G, G, G, G],
  ];
  const g = groundOf(rows, 400, 400);
  const west = planDeckTile(g, 401, 401)!;
  assert.equal(west.family, 'porch');
  assert.ok(west.wallN);
  assert.deepEqual([west.hasW, west.hasE, west.hasN, west.hasS], [false, true, false, false]);
  assert.ok(west.treadS);
  const rail = planDeckTile(g, 402, 401)!;
  assert.equal(rail.family, 'porch');
  assert.ok(rail.hasW && rail.hasE);
  assert.equal(deckLiftAt(g, 402.5, 401.5), DOCK_LIFT);
  assert.equal(deckLiftAt(g, 402.5, 402.5), 0);
  // A 3-long porch runs E-W: long-plank rhythm.
  assert.equal(porchArm(g, 401, 401), false);
});

test('strip variants follow the world row for long planks and the column for cross boards', () => {
  const a = deckStripVariant('dock', false, 0, 5);
  const b = deckStripVariant('dock', false, 9, 5);
  assert.equal(a, b);
  const c = deckStripVariant('dock', true, 3, 0);
  const d = deckStripVariant('dock', true, 3, 8);
  assert.equal(c, d);
});

test('the pile face puts the water plane where the leg leaves the air', () => {
  const h = 100;
  const row = pilePlaneRow(DOCK_LIFT, h);
  const above = DOCK_LIFT - JOIST_H;
  assert.ok(Math.abs(row - (h * above) / (above + PILE_DRIVE)) < 1e-9);
  assert.ok(row > 0 && row < h);
});
