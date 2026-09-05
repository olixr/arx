import test from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { gridSampler, isGarrisonSideGate } from './structKinds.js';
import { StructSink } from './structSink.js';
import {
  ALL_EXPOSED,
  DIRS,
  LEAF_OPEN_SWING,
  barrierEndpoint,
  barrierGateVertical,
  barrierJoins,
  barrierKindOf,
  barrierNode,
  emitBox,
  emitCard,
  emitCross,
  emitRunBox,
  garrisonGateRuns,
  hedgeExposure,
  hedgeMassAt,
  leafSwing,
  swingLeafEnd,
  type FaceRect,
} from './barrierGeom.js';

const G = Tile.Grass;
const F = Tile.Fence;
const FNE = Tile.FenceDiagNE;
const FNW = Tile.FenceDiagNW;
const FG = Tile.FenceGate;
const H = Tile.Hedge;
const HG = Tile.HedgeGate;
const I = Tile.IronFence;
const WG = Tile.WallGarrison;
const GG = Tile.GateGarrison;
const GGS = Tile.GateGarrisonShut;
const WS = Tile.WallStone;

/** Float32-drained arrays against float64 expectations. */
const near = (actual: number[], expected: number[], eps = 1e-5): void => {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i]! - expected[i]!) < eps, `[${i}] ${actual[i]} ≉ ${expected[i]}`);
};

const dir = (dx: number, dy: number): number => DIRS.findIndex(([x, y]) => x === dx && y === dy);
const bit = (dx: number, dy: number): number => 1 << dir(dx, dy);

// ---------------------------------------------------------- kinds

test('barrier kinds: straight, the two diagonals, gates; other families answer null', () => {
  assert.equal(barrierKindOf('fence', F), 'straight');
  assert.equal(barrierKindOf('fence', FNE), 'diagNE');
  assert.equal(barrierKindOf('fence', FNW), 'diagNW');
  assert.equal(barrierKindOf('fence', FG), 'gate');
  assert.equal(barrierKindOf('fence', Tile.FenceGateShut), 'gate');
  assert.equal(barrierKindOf('fence', H), null, 'the separate-masonry law');
  assert.equal(barrierKindOf('fence', WS), null, 'a fence beside a house wall ends');
  assert.equal(barrierKindOf('fence', undefined), null);
  assert.equal(barrierKindOf('hedge', Tile.HedgeDiagNW), 'diagNW');
  assert.equal(barrierKindOf('iron', Tile.IronGateShut), 'gate');
  assert.equal(barrierKindOf('palisade', Tile.PalisadeGate), 'gate');
});

// ------------------------------------------------------ a fence pen

// A 4x3 pen: posts every tile, a gate on the south side.
const PEN = [
  [F, F, F, F],
  [F, G, G, F],
  [F, FG, F, F],
];

test('a fence pen: through-run nodes own one edge each way, corners anchor, the gate has no node edges', () => {
  const s = gridSampler(PEN);
  const nw = barrierNode('fence', s, 0, 0)!;
  assert.equal(nw.kind, 'straight');
  assert.ok(nw.anchor, 'a corner anchors');
  assert.ok(!nw.through);
  // Owns E and S edges, both centre to centre.
  assert.deepEqual(
    nw.edges.map((e) => [e.dx, e.dy, e.ax, e.az, e.bx, e.bz, e.len]),
    [
      [1, 0, 0.5, 0.5, 1.5, 0.5, 1],
      [0, 1, 0.5, 0.5, 0.5, 1.5, 1],
    ],
  );
  const mid = barrierNode('fence', s, 1, 0)!;
  assert.ok(mid.through, 'an E–W pass-through');
  assert.ok(!mid.anchor);
  assert.equal(mid.edges.length, 1, 'owns only its east edge (the west one is its neighbour’s)');
  assert.equal(mid.incident, bit(1, 0) | bit(-1, 0));
  // The tile west of the gate reaches the gate's BOUNDARY, half a tile.
  const wOfGate = barrierNode('fence', s, 0, 2)!;
  const toGate = wOfGate.edges.find((e) => e.dx === 1)!;
  assert.ok(toGate.toGate);
  assert.deepEqual([toGate.ax, toGate.az, toGate.bx, toGate.bz, toGate.len], [0.5, 2.5, 1, 2.5, 0.5]);
  // The gate owns nothing and reads horizontal.
  const gate = barrierNode('fence', s, 1, 2)!;
  assert.equal(gate.kind, 'gate');
  assert.equal(gate.edges.length, 0);
  assert.ok(!barrierGateVertical('fence', s, 1, 2));
  // The tile east of the gate OWNS its west half-edge (a gate owns nothing, so both neighbours reach it).
  assert.ok(barrierJoins('fence', s, 2, 2, -1, 0));
  const eOfGate = barrierNode('fence', s, 2, 2)!;
  const west = eOfGate.edges.find((e) => e.dx === -1)!;
  assert.ok(west && west.toGate);
  assert.deepEqual([west.ax, west.az, west.bx, west.bz, west.len], [2.5, 2.5, 2, 2.5, 0.5]);
});

test('every edge is emitted exactly once: the owned edges over a pen equal the join count / 2', () => {
  const s = gridSampler(PEN);
  let owned = 0;
  let joins = 0;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 4; x++) {
      const n = barrierNode('fence', s, x, y);
      if (!n) continue;
      owned += n.edges.length;
      joins += n.degree;
    }
  }
  // Each join is counted from both ends; gates count from their neighbours only.
  assert.equal(owned * 2, joins);
});

// -------------------------------------------------------- diagonals

// A run turning "/" : (0,2) F → (1,1) FenceDiagNE → (2,0) F.
const SLASH = [
  [G, G, F],
  [G, FNE, G],
  [F, G, G],
];

test('a "/" turn: the diagonal strides NE and SW, straight tiles stub toward it, symmetric', () => {
  const s = gridSampler(SLASH);
  assert.ok(barrierJoins('fence', s, 1, 1, 1, -1), 'the / joins NE');
  assert.ok(barrierJoins('fence', s, 1, 1, -1, 1), 'the / joins SW');
  assert.ok(barrierJoins('fence', s, 2, 0, -1, 1), 'the NE tile joins back');
  assert.ok(barrierJoins('fence', s, 0, 2, 1, -1), 'the SW tile joins back');
  assert.ok(!barrierJoins('fence', s, 1, 1, -1, -1), 'a / never joins NW');
  const d = barrierNode('fence', s, 1, 1)!;
  assert.ok(d.anchor, 'every 45° tile anchors');
  // Owns SW (toward (0,2)); the NE edge belongs to (2,0) as its SW edge.
  assert.deepEqual(
    d.edges.map((e) => [e.dx, e.dy]),
    [[-1, 1]],
  );
  const ne = barrierNode('fence', s, 2, 0)!;
  assert.deepEqual(
    ne.edges.map((e) => [e.dx, e.dy, e.len.toFixed(3)]),
    [[-1, 1, Math.SQRT2.toFixed(3)]],
  );
  const sw = barrierNode('fence', s, 0, 2)!;
  assert.equal(sw.edges.length, 0, 'its NE edge is owned by the diagonal');
});

test('a "\\" beside a "/" does not join it (only a matching stroke wants the corner)', () => {
  const s = gridSampler([
    [G, FNW],
    [FNE, G],
  ]);
  assert.ok(!barrierJoins('fence', s, 0, 1, 1, -1));
});

test('an isolated tile still shows its build: a full E–W panel, a full diagonal stride', () => {
  const s = gridSampler([[G, F, G, FNE]]);
  const iso = barrierNode('fence', s, 1, 0)!;
  assert.ok(iso.isolated);
  assert.ok(!iso.anchor);
  assert.deepEqual(iso.edges.map((e) => [e.ax, e.bx, e.len]), [[1, 2, 1]]);
  const isoD = barrierNode('fence', s, 3, 0)!;
  assert.equal(isoD.edges.length, 1);
  assert.equal(isoD.edges[0]!.len, Math.SQRT2);
});

test('a vertical gate: posts on the N/S boundary', () => {
  const s = gridSampler([[F], [FG], [F]]);
  assert.ok(barrierGateVertical('fence', s, 0, 1));
  const p = { x: 0, z: 0 };
  assert.deepEqual(barrierEndpoint('gate', 0, 1, 0, -1, p), { x: 0.5, z: 1 });
  assert.deepEqual(barrierEndpoint('gate', 0, 1, 0, 1, p), { x: 0.5, z: 2 });
  assert.deepEqual(barrierEndpoint('straight', 3, 4, 1, 0, p), { x: 3.5, z: 4.5 });
});

// ------------------------------------------------------------- hedge

test('hedge exposure: faces only where the neighbour is not straight hedge; gates and 45° tiles expose', () => {
  const s = gridSampler([
    [H, H, H],
    [H, G, HG],
    [H, Tile.HedgeDiagNE, G],
  ]);
  const ex = { n: false, e: false, s: false, w: false };
  hedgeExposure(s, 1, 0, ex);
  assert.deepEqual(ex, { n: true, e: false, s: true, w: false });
  // THE GATE IS THE HEDGE, THICKENED AT THE GAP: the gate below runs N–S
  // (its hedge is to the north), so along its own axis its stub JOINS the
  // run above — a cut, no face; across the axis it is an opening.
  hedgeExposure(s, 2, 0, ex);
  assert.deepEqual(ex, { n: true, e: true, s: false, w: false }, 'a hedge gate below, on its axis, is a cut');
  assert.ok(hedgeMassAt(s, 2, 1, 0, 1), 'the gate is mass along its axis (asked from the north)');
  assert.ok(!hedgeMassAt(s, 2, 1, 1, 0) && !hedgeMassAt(s, 2, 1, 0, 0), 'an opening across it; an aimless ask is never mass');
  // A gate with hedge to its EAST and WEST runs E–W: mass from E/W, an opening from N/S.
  const ew = gridSampler([[G, G, G], [H, HG, H], [G, G, G]]);
  assert.ok(hedgeMassAt(ew, 1, 1, 1, 0) && hedgeMassAt(ew, 1, 1, -1, 0), 'the E–W gate joins its run');
  assert.ok(!hedgeMassAt(ew, 1, 1, 0, 1) && !hedgeMassAt(ew, 1, 1, 0, -1), 'and opens across it');
  hedgeExposure(ew, 0, 1, ex);
  assert.deepEqual(ex, { n: true, e: false, s: true, w: true }, 'the run west of the gate shows no face toward it');
  hedgeExposure(s, 0, 2, ex);
  assert.deepEqual(ex, { n: false, e: true, s: true, w: true }, 'a 45° hedge east is a slab, the face shows');
});

// ------------------------------------------------------------- iron

test('iron: a corner anchors (a pier), a through N–S joint does not', () => {
  const s = gridSampler([
    [I, I, I],
    [I, G, G],
    [I, G, G],
  ]);
  assert.ok(barrierNode('iron', s, 0, 0)!.anchor);
  const mid = barrierNode('iron', s, 0, 1)!;
  assert.ok(mid.through && !mid.anchor);
  assert.equal(mid.incident, bit(0, -1) | bit(0, 1));
  assert.ok(barrierNode('iron', s, 0, 2)!.anchor, 'a run end anchors');
});

// --------------------------------------------------------- garrison

test('garrison gate runs merge E–W from the west anchor; a side gate is its own run', () => {
  const rows = [
    [WG, WG, WG, WG, WG, WG],
    [G, G, G, G, G, WG],
    [WG, GG, GG, GG, WG, GGS],
    [G, G, G, G, G, WG],
  ];
  const s = gridSampler(rows);
  const runs = garrisonGateRuns(s, 0, 0, 6, (tx, ty) => isGarrisonSideGate(s, tx, ty));
  assert.deepEqual(
    runs.map((r) => [r.tx, r.ty, r.len, r.open, r.side]),
    [
      [1, 2, 3, true, false],
      [5, 2, 1, false, true],
    ],
  );
  // Only the chunk holding the anchor emits a run.
  assert.equal(garrisonGateRuns(s, 2, 0, 4, (tx, ty) => isGarrisonSideGate(s, tx, ty)).filter((r) => !r.side).length, 0);
});

// ------------------------------------------------------------ boxes

const R: FaceRect = { page: 0, u0: 0.1, v0: 0.2, u1: 0.3, v1: 0.6 };

test('emitBox: faces on exposed sides only, u reads W→E from outside, v base→crown', () => {
  const sink = new StructSink();
  const n = emitBox(sink, 'opaque', { side: R, top: R }, 2, 3, 3, 4, 1, 2, ALL_EXPOSED);
  assert.equal(n, 5);
  assert.equal(sink.quads, 5);
  const [b] = sink.drain();
  assert.ok(b);
  assert.equal(b.kind, 'opaque');
  assert.equal(b.triangles, 10);
  // Every y is 1 or 2, every x in [2,3], z in [3,4].
  for (let i = 0; i < b.vertexCount; i++) {
    const x = b.positions[i * 3]!;
    const y = b.positions[i * 3 + 1]!;
    const z = b.positions[i * 3 + 2]!;
    assert.ok(x >= 2 && x <= 3 && z >= 3 && z <= 4 && (y === 1 || y === 2));
  }
  // The south face (first quad): a = (2, 4) base, b = (3, 4) base, then crown.
  assert.deepEqual(Array.from(b.positions.slice(0, 12)), [2, 1, 4, 3, 1, 4, 3, 2, 4, 2, 2, 4]);
  near(Array.from(b.uvs.slice(0, 8)), [0.1, 0.2, 0.3, 0.2, 0.3, 0.6, 0.1, 0.6]);
  // The north face reads east→west from outside.
  assert.deepEqual(Array.from(b.positions.slice(12, 18)), [3, 1, 3, 2, 1, 3]);
  const sink2 = new StructSink();
  assert.equal(emitBox(sink2, 'opaque', { side: R, top: R }, 0, 0, 1, 1, 0, 1, { n: false, e: false, s: true, w: false, top: false }), 1);
});

test('emitRunBox: a run along any bearing — two flanks, optional caps, a top; a diagonal keeps its width', () => {
  const sink = new StructSink();
  const n = emitRunBox(sink, 'opaque', { side: R, end: R, top: R }, 0, 0, 1, 1, 0.2, 0, 0, 0.5, true, false);
  assert.equal(n, 4);
  const [b] = sink.drain();
  assert.ok(b);
  // The first flank's base corners sit 0.1 off the a→b line.
  const ax = b.positions[0]!;
  const az = b.positions[2]!;
  assert.ok(Math.abs(Math.hypot(ax, az) - 0.1) < 1e-5);
  // Every vertex y is 0 or 0.5.
  for (let i = 0; i < b.vertexCount; i++) {
    const y = b.positions[i * 3 + 1]!;
    assert.ok(y === 0 || y === 0.5);
  }
  // A sloping run: base a at 0, b at 1.35 → the top follows.
  const s2 = new StructSink();
  emitRunBox(s2, 'opaque', { side: R, top: R }, 0, 0, 1, 0, 0.2, 0, 1.35, 0.5, false, false);
  const [b2] = s2.drain();
  const ys = new Set<number>();
  for (let i = 0; i < b2!.vertexCount; i++) ys.add(b2!.positions[i * 3 + 1]!);
  near([...ys].sort((a, c) => a - c), [0, 0.5, 1.35, 1.85]);
});

test('emitCard: one quad along a→b with a partial u range; emitCross: two cards turned off the axes', () => {
  const sink = new StructSink();
  emitCard(sink, 'cutout', R, 0, 0, 0.5, 0, 0, 0, 1, 0, 0.5);
  assert.equal(sink.quads, 1);
  const [b] = sink.drain();
  assert.equal(b!.kind, 'cutout');
  // u runs 0.1 → 0.2 (half the rect), v 0.2 → 0.6.
  near(Array.from(b!.uvs), [0.1, 0.2, 0.2, 0.2, 0.2, 0.6, 0.1, 0.6]);
  const s2 = new StructSink();
  emitCross(s2, 'cutout', R, 5, 5, 0, 0.2, 1);
  assert.equal(s2.quads, 2);
  const [c] = s2.drain();
  // Neither card is axis-aligned: both dx and dz of each card's base edge are non-zero.
  for (const q of [0, 4]) {
    const dx = c!.positions[(q + 1) * 3]! - c!.positions[q * 3]!;
    const dz = c!.positions[(q + 1) * 3 + 2]! - c!.positions[q * 3 + 2]!;
    assert.ok(Math.abs(dx) > 1e-6 && Math.abs(dz) > 1e-6);
    assert.ok(Math.abs(Math.hypot(dx, dz) - 0.2) < 1e-5, 'card width kept');
  }
});

// ------------------------------------------------------------ gates

test('the leaf swings: shut along the run, open toward the swing side', () => {
  const p = { x: 0, z: 0 };
  swingLeafEnd(1, 1, 1, 0, 0, 1, 0.8, leafSwing(false), p);
  assert.deepEqual([p.x, p.z], [1.8, 1]);
  swingLeafEnd(1, 1, 1, 0, 0, 1, 0.8, leafSwing(true), p);
  assert.ok(p.z > 1.7 && p.x < 1.0, 'an open leaf stands across the line, a hair past square');
  assert.ok(LEAF_OPEN_SWING > Math.PI / 2 && LEAF_OPEN_SWING < Math.PI);
});
