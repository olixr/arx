import test from 'node:test';
import assert from 'node:assert/strict';
import { Detail, Tile } from '@arx/shared';
import { GARRISON_H, MERLON_H, WALL_STUB } from '../../render/paintVocab.js';
import { ELEV_H as ELEV_H_2D } from '../../render/elevPick.js';
import {
  ELEV_H,
  GARRISON_H as GARRISON_H_3D,
  MERLON_H as MERLON_H_3D,
  WALL_STUB as WALL_STUB_3D,
  classifyTile,
  diagMassTouches,
  familyOf,
  gridSampler,
  isSideDoorway,
  ringStands,
  scanChunkStructs,
  snapshotWithBorder,
  wallish,
  type StructSampler,
} from './structKinds.js';
import { StructSink, bucketBytes, bucketKey, bucketKind, bucketPage } from './structSink.js';
import { litTone, parseHex, shadedTone } from './faceTone.js';

const G = Tile.Grass;
const WS = Tile.WallStone;
const WW = Tile.WallWood;
const WIN = Tile.WallWoodWindow;
const DS = Tile.DoorwayStone;
const F = Tile.Fence;
const FG = Tile.FenceGate;

// ------------------------------------------------- the 2D constants

test('the restated 2D heights agree with their 2D homes', () => {
  assert.equal(WALL_STUB_3D, WALL_STUB);
  assert.equal(GARRISON_H_3D, GARRISON_H);
  assert.equal(MERLON_H_3D, MERLON_H);
  assert.equal(ELEV_H, ELEV_H_2D);
});

// ---------------------------------------------------- a 5x5 house

// A 5x5 stone house: solid ring, a SOUTH doorway at (2,4) and a SIDE
// doorway on the west wall at (0,2).
const HOUSE = [
  [WS, WS, WS, WS, WS],
  [WS, G, G, G, WS],
  [DS, G, G, G, WS],
  [WS, G, G, G, WS],
  [WS, WS, DS, WS, WS],
];

test('a 5x5 house: ring tiles are walls, floors are none, the side doorway ends its run', () => {
  const s = gridSampler(HOUSE);
  assert.equal(familyOf(s.groundAt(1, 1)), 'none');
  const nw = classifyTile(s, 0, 0);
  assert.equal(nw.family, 'wall');
  assert.equal(nw.material, 'stone');
  // Corner: continues east and south, exposed north and west.
  assert.deepEqual([nw.runN, nw.runE, nw.runS, nw.runW], [false, true, true, false]);

  // The side doorway on the west wall: wallish is FALSE for it (the
  // run ends), and the walls above and below it are exposed toward it.
  assert.ok(isSideDoorway(s, 0, 2));
  assert.ok(!wallish(s, 0, 2));
  const above = classifyTile(s, 0, 1);
  assert.equal(above.runS, false, 'the wall north of a side door shows its jamb');
  const below = classifyTile(s, 0, 3);
  assert.equal(below.runN, false, 'the wall south of a side door restarts');
  const door = classifyTile(s, 0, 2);
  assert.ok(door.sideDoorway);
  assert.equal(door.door?.material, 'stone');
  // The doorway's own faces: N/S continue into the wall, E/W are the passage.
  assert.deepEqual([door.runN, door.runS, door.runE, door.runW], [true, true, false, false]);

  // The south-facing doorway carries the run through.
  assert.ok(!isSideDoorway(s, 2, 4));
  assert.ok(wallish(s, 2, 4));
  const left = classifyTile(s, 1, 4);
  assert.equal(left.runE, true, 'a south doorway merges with the run');
  const sd = classifyTile(s, 2, 4);
  assert.ok(!sd.sideDoorway);
  assert.deepEqual([sd.runW, sd.runE, sd.runN, sd.runS], [true, true, false, false]);
});

test('a lone doorway with wall on all four sides is not a side doorway (horiz AND vert)', () => {
  const s = gridSampler([
    [G, WS, G],
    [WS, DS, WS],
    [G, WS, G],
  ]);
  assert.ok(!isSideDoorway(s, 1, 1));
});

// -------------------------------------------------- windowed run

test('a windowed run: windows fold to their base material and stay continuous', () => {
  const s = gridSampler([[WW, WIN, WIN, WW]], { detail: [[0, Detail.WallBanner + 3, 0, 0]] });
  const w = classifyTile(s, 1, 0);
  assert.equal(w.family, 'wall');
  assert.equal(w.material, 'wood');
  assert.ok(w.isWindow);
  assert.deepEqual([w.runW, w.runE, w.runN, w.runS], [true, true, false, false]);
  assert.equal(w.wallHung?.kind, 'banner');
  assert.equal(w.wallHung?.dye, 3);
  const end = classifyTile(s, 3, 0);
  assert.deepEqual([end.runW, end.runE], [true, false]);
});

// ------------------------------------------------ diagonal corner

test('a diagonal corner: diagWallInfo names the solid triangle and the run continues through it', () => {
  // NE mass = solid across the N and E edges, cutting the SW corner:
  // it joins a wall to its north and a wall to its east.
  const s = gridSampler([
    [G, WS],
    [Tile.WallStoneDiagNE, WS],
  ]);
  const d = classifyTile(s, 0, 1);
  assert.equal(d.family, 'wall');
  assert.equal(d.material, 'stone');
  assert.deepEqual(d.diag, { material: 'stone', mass: 'NE' });
  assert.deepEqual([d.runN, d.runE, d.runS, d.runW], [false, true, false, false]);
  const wood = classifyTile(gridSampler([[Tile.WallWoodDiagSW]]), 0, 0);
  assert.equal(wood.material, 'wood');
  assert.equal(wood.diag?.mass, 'SW');
});

test('THE DIAGONAL TOUCHES ONLY TWO EDGES: a wall abutting a diagonal\'s open edge keeps its end face', () => {
  // A DiagNE's mass spans its N and E edges; its W and S edges are open air behind the hypotenuse.
  const s = gridSampler([
    [G, G, G],
    [WS, Tile.WallStoneDiagNE, G],
    [G, WS, G],
  ]);
  const west = classifyTile(s, 0, 1);
  assert.equal(west.runE, false, 'the wall west of a DiagNE abuts open air: its east face stands');
  const south = classifyTile(s, 1, 2);
  assert.equal(south.runN, false, 'the wall south of it likewise keeps its north face');
  const diag = classifyTile(s, 1, 1);
  assert.deepEqual([diag.runN, diag.runE, diag.runS, diag.runW], [false, false, false, false], 'and the diag joins neither (no mass on those edges)');
  // The joining case still joins: a wall EAST of a DiagNE shares its E edge.
  const j = gridSampler([[Tile.WallStoneDiagNE, WS]]);
  assert.equal(classifyTile(j, 1, 0).runW, true);
  assert.equal(classifyTile(j, 0, 0).runE, true);
  // The pure rule, all four masses × four steps.
  assert.deepEqual(['NE', 'NW', 'SE', 'SW'].map((m) => diagMassTouches(m as 'NE', 1, 0)), [false, true, false, true], 'stepping east, the neighbour\'s W edge');
  assert.deepEqual(['NE', 'NW', 'SE', 'SW'].map((m) => diagMassTouches(m as 'NE', -1, 0)), [true, false, true, false], 'stepping west, its E edge');
  assert.deepEqual(['NE', 'NW', 'SE', 'SW'].map((m) => diagMassTouches(m as 'NE', 0, 1)), [true, true, false, false], 'stepping south, its N edge');
  assert.deepEqual(['NE', 'NW', 'SE', 'SW'].map((m) => diagMassTouches(m as 'NE', 0, -1)), [false, false, true, true], 'stepping north, its S edge');
  // Garrison diagonals follow the same rule.
  const g = gridSampler([[Tile.WallGarrison, Tile.WallGarrisonDiagNE]]);
  assert.equal(classifyTile(g, 0, 0).runE, false, 'a curtain west of a garrison DiagNE ends there');
});

// --------------------------------------------- fence pen with a gate

test('a fence pen with a gate: gates continue the run, diagonals report corners', () => {
  const s = gridSampler([
    [F, F, FG, F, F],
    [F, G, G, G, F],
    [Tile.FenceDiagNE, G, G, G, F],
    [G, F, F, F, F],
  ]);
  const gate = classifyTile(s, 2, 0);
  assert.equal(gate.family, 'fence');
  assert.equal(gate.door?.material, 'fence');
  assert.ok(gate.door?.open);
  assert.deepEqual([gate.runW, gate.runE, gate.runN, gate.runS], [true, true, false, false]);
  const diag = classifyTile(s, 0, 2);
  assert.equal(diag.barrierDiag, 'NE');
  assert.equal(diag.runN, true);
  assert.equal(diag.cornerSE, true, 'the "/" stroke lands on the SW->NE diagonal; its SE corner is fenced');
  assert.equal(diag.cornerNE, false);
  const shut = classifyTile(gridSampler([[Tile.FenceGateShut]]), 0, 0);
  assert.equal(shut.door?.open, false);
});

// ------------------------------------- cross-family adjacency

test('cross-family adjacency: a fence beside a wall leaves both exposed', () => {
  const s = gridSampler([[F, F, WS, WS]]);
  const fence = classifyTile(s, 1, 0);
  const wall = classifyTile(s, 2, 0);
  assert.equal(fence.runE, false, 'the fence does not merge into the wall');
  assert.equal(wall.runW, false, 'the wall does not merge into the fence');
  assert.equal(fence.runW, true);
  assert.equal(wall.runE, true);
  // Garrison beside a house wall: two honest ends (the separate-masonry law).
  const g = gridSampler([[Tile.WallGarrison, WS]]);
  assert.equal(classifyTile(g, 0, 0).runE, false);
  assert.equal(classifyTile(g, 1, 0).runW, false);
  // Hedge beside iron: likewise.
  const h = gridSampler([[Tile.Hedge, Tile.IronFence]]);
  assert.equal(classifyTile(h, 0, 0).family, 'hedge');
  assert.equal(classifyTile(h, 0, 0).runE, false);
  assert.equal(classifyTile(h, 1, 0).family, 'iron');
});

test('garrison: a side gate ends the curtain like a side doorway ends a wall', () => {
  const s = gridSampler([[Tile.WallGarrison], [Tile.GateGarrison], [Tile.WallGarrison]]);
  const gate = classifyTile(s, 0, 1);
  assert.ok(gate.sideDoorway);
  assert.equal(classifyTile(s, 0, 0).runS, false);
  assert.equal(classifyTile(s, 0, 2).runN, false);
  // A south-facing (E-W) gatehouse merges with the curtain.
  const ew = gridSampler([[Tile.WallGarrison, Tile.GateGarrison, Tile.GateGarrison, Tile.WallGarrison]]);
  assert.equal(classifyTile(ew, 1, 0).sideDoorway, false);
  assert.equal(classifyTile(ew, 0, 0).runE, true);
  assert.equal(classifyTile(ew, 1, 0).runE, true);
});

test('decks: bridge and dock are one class, the porch ashore is its own; cliffs and elev lift', () => {
  const s = gridSampler([[Tile.Dock, Tile.Bridge, Tile.PorchDeck, Tile.Cliff]], { elev: [[0, 0, 0, 2]] });
  const dock = classifyTile(s, 0, 0);
  assert.equal(dock.family, 'deck');
  assert.equal(dock.deckKind, 'dock');
  assert.equal(dock.runE, true, 'dock continues into bridge');
  const porch = classifyTile(s, 2, 0);
  assert.equal(porch.deckKind, 'porch');
  assert.equal(porch.runW, false, 'a porch never merges with a water deck');
  const cliff = classifyTile(s, 3, 0);
  assert.equal(cliff.family, 'cliff');
  assert.equal(cliff.elev, 2);
  assert.equal(cliff.lift, 2 * ELEV_H);
});

test('awning tiles read their shape and dye', () => {
  const t = classifyTile(gridSampler([[Tile.AwningMarket + 4]]), 0, 0);
  assert.equal(t.family, 'none');
  assert.equal(t.awning?.dye, 4);
  assert.equal(t.awning?.shape, 'market');
});

// ---------------------------------------------------- chunk scan

test('scanChunkStructs lists by family in scan order and reads the border through the sampler', () => {
  const size = 4;
  // World: a wall run that crosses the chunk's east border.
  const world: StructSampler = gridSampler([[G, G, G, WS, WS, WS]], { ox: 0, oy: 0 });
  const scan = scanChunkStructs(world, 0, 0, size);
  assert.equal(scan.tiles.length, 1);
  const w = scan.tiles[0]!;
  assert.equal(w.tx, 3);
  assert.equal(w.runE, true, 'the neighbour past the chunk edge continues the run');
  assert.equal(w.runW, false);
  assert.deepEqual([...scan.byFamily.keys()], ['wall']);

  // The bordered snapshot answers the same, and nothing past the ring.
  const snap = snapshotWithBorder(world, 0, 0, size, 1);
  assert.equal(snap.groundAt(4, 0), WS, 'one tile past the chunk is in the snapshot');
  assert.equal(snap.groundAt(5, 0), undefined, 'two tiles past is not');
  assert.equal(snap.groundAt(-2, 0), undefined);
  assert.equal(snap.elevAt(99, 99), 0);
  const scan2 = scanChunkStructs(snap, 0, 0, size);
  assert.equal(scan2.tiles[0]!.runE, true);
});

test('THE BORDER WAKES ONLY WHEN IT STANDS: a seam wakes on a standing ring tile or an elev step, never on grass', () => {
  const size = 4;
  // A 4×4 chunk at (0,0) with a 1-tile ring; a wall east of the seam, a cliff step north, grass elsewhere.
  const rows = [
    [G, G, G, G, G, G],
    [G, G, G, G, G, WS],
    [G, G, G, G, G, G],
    [G, G, G, G, G, G],
    [G, G, G, G, G, G],
    [G, G, G, G, G, G],
  ];
  const elev = rows.map((r, y) => r.map(() => (y === 0 ? 1 : 0)));
  const s = gridSampler(rows, { elev, ox: -1, oy: -1 });
  assert.equal(ringStands(s, 0, 0, size, 1, 0), true, 'east: a wall stands in the ring');
  assert.equal(ringStands(s, 0, 0, size, 0, -1), true, 'north: the ring is a level up');
  assert.equal(ringStands(s, 0, 0, size, -1, 1), false, 'south-west corner: grass on grass');
  assert.equal(ringStands(s, 0, 0, size, 0, 1), false, 'south: grass on grass');
  assert.equal(ringStands(s, 0, 0, size, 1, -1), true, 'north-east corner: the step');
  assert.equal(ringStands(s, 0, 0, size, 1, 1), false, 'south-east corner: nothing');
});

// ---------------------------------------------------------- sink

test('StructSink buckets by (kind,page), corrects winding and drains typed arrays', () => {
  const sink = new StructSink();
  // A south face (normal +Z) handed in the "wrong" order still lands front-facing.
  sink.face('opaque', 0, 1, 2, 0, 2, 0, 2.05, 0, 0, 1, 1, 0, 1);
  sink.face('cutout', 1, 0, 0, 1, 0, 0, 1.72, 0, 0, 1, 1, 0, -1);
  sink.top('opaque', 0, 0, 0, 1, 1, 2.05, 0, 0, 1, 1);
  assert.equal(sink.quads, 3);
  const buckets = sink.drain();
  assert.equal(buckets.length, 2);
  const op = buckets.find((b) => b.kind === 'opaque')!;
  assert.equal(op.page, 0);
  assert.equal(op.triangles, 4);
  assert.equal(op.vertexCount, 8);
  assert.equal(op.maxY, 2.05);
  assert.equal(op.minY, 0);
  // Winding check: first triangle of the face has normal along +Z.
  const i0 = op.indices[0]! * 3;
  const i1 = op.indices[1]! * 3;
  const i2 = op.indices[2]! * 3;
  const P = op.positions;
  const ax = P[i1]! - P[i0]!;
  const ay = P[i1 + 1]! - P[i0 + 1]!;
  const az = P[i1 + 2]! - P[i0 + 2]!;
  const bx = P[i2]! - P[i0]!;
  const by = P[i2 + 1]! - P[i0 + 1]!;
  const bz = P[i2 + 2]! - P[i0 + 2]!;
  const nz = ax * by - ay * bx;
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  assert.ok(nz > 0 && Math.abs(nx) < 1e-9 && Math.abs(ny) < 1e-9, 'front face toward +Z');
  const cut = buckets.find((b) => b.kind === 'cutout')!;
  assert.equal(cut.page, 1);
  assert.equal(bucketKey('cutout', 1), cut.key);
  assert.equal(bucketKind(cut.key), 'cutout');
  assert.equal(bucketPage(cut.key), 1);
  assert.ok(bucketBytes(op) > 0);
  assert.ok(sink.isEmpty, 'drain empties the sink');
});

test('THE BUCKET KNOWS ITS OWN EXTENT: the drained AABB wraps every vertex landed, not the chunk footprint', () => {
  const sink = new StructSink();
  // A face reaching from x 30 to 34.5 (two tiles past a 32-chunk) and a top at z 40..41.
  sink.face('opaque', 0, 30, 2, 34.5, 2, 0.5, 3.4, 0, 0, 1, 1, 0, 1);
  sink.top('opaque', 0, -1.5, 40, 0, 41, 2.05, 0, 0, 1, 1);
  const [b] = sink.drain();
  assert.deepEqual([b!.minX, b!.maxX, b!.minZ, b!.maxZ, b!.minY, b!.maxY], [-1.5, 34.5, 2, 41, 0.5, 3.4]);
});

// ------------------------------------------------------ face tone

test('litTone lifts toward white, shadedTone toward black, both round-trip hex', () => {
  assert.deepEqual(parseHex('#8c8798'), [0x8c, 0x87, 0x98]);
  assert.equal(litTone('#000000', 0.5), '#808080');
  assert.equal(litTone('#ffffff'), '#ffffff');
  assert.equal(litTone('#8c8798', 0), '#8c8798');
  assert.equal(shadedTone('#ffffff', 0.5), '#808080');
  assert.equal(litTone('not-a-hex'), 'not-a-hex');
  const lit = parseHex(litTone('#5b5566'))!;
  const src = parseHex('#5b5566')!;
  for (let i = 0; i < 3; i++) assert.ok(lit[i]! > src[i]!);
});
