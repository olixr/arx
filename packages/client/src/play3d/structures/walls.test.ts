import test from 'node:test';
import assert from 'node:assert/strict';
import { Detail, Tile } from '@arx/shared';
import { WOOD_SKINS } from '../../render/woodSkins.js';
import type { InteriorMap } from '../../render/interiors.js';
import type { WorldSource3D } from '../world.js';
import type { FaceAtlas, FaceRef } from './faceAtlas.js';
import { ELEV_H, gridSampler, scanChunkStructs, type StructSampler } from './structKinds.js';
import { StructSink } from './structSink.js';
import type { StubHost } from './stubHost.js';
import type { StructBuildCtx } from './structures.js';
import { doorLeaves } from './doors.js';
import { buildWallStructures, diagShape, sideFace, windowSpan, type FaceEdge } from './walls.js';
import { DOOR_JAMB, WINDOW_HEAD, WINDOW_SILL, timberCourses } from './wallFaces.js';

const G = Tile.Grass;
const WS = Tile.WallStone;
const WW = Tile.WallWood;
const WIN = Tile.WallStoneWindow;
const DS = Tile.DoorwayStone;
const DSS = Tile.DoorwayStoneShut;
const DSW = Tile.DoorwayStoneWide;
const AWN = Tile.AwningMarket + 2;

/** A fake atlas: every key answers a unit rect on page 0, never paints. */
function fakeAtlas(): FaceAtlas & { keys: string[] } {
  const keys: string[] = [];
  const refs = new Map<string, FaceRef>();
  return {
    keys,
    pages: [],
    get(key: string): FaceRef {
      let r = refs.get(key);
      if (!r) {
        keys.push(key);
        refs.set(key, (r = { page: 0, u0: 0, v0: 0, u1: 1, v1: 1, w: 48, h: 98 }));
      }
      return r;
    },
  } as unknown as FaceAtlas & { keys: string[] };
}

/** A build context over an authored grid inside chunk (0,0); `inside` marks room tiles. */
function ctxOver(rows: ReadonlyArray<ReadonlyArray<number>>, opts?: { detail?: ReadonlyArray<ReadonlyArray<number>>; inside?: (tx: number, ty: number) => boolean; height?: (wx: number, wy: number) => number }): StructBuildCtx & { atlas: FaceAtlas & { keys: string[] } } {
  const sampler: StructSampler = gridSampler(rows, { detail: opts?.detail });
  const scan = scanChunkStructs(sampler, 0, 0, 32, ELEV_H);
  const atlas = fakeAtlas();
  const region = { id: 1, tiles: new Set<number>(), wallTiles: new Set<number>(), x0: 0, y0: 0, x1: 0, y1: 0, doorTiles: [], wallMaterial: WS, hasHearth: false, elevLevel: 0, seed: 1 };
  return {
    world: {} as WorldSource3D,
    cx: 0,
    cy: 0,
    size: 32,
    x0: 0,
    y0: 0,
    sampler,
    scan,
    atlas,
    host: {} as StubHost,
    elevH: ELEV_H,
    heightAt: opts?.height ?? (() => 0),
    interiors: {} as InteriorMap,
    regionAt: (tx, ty) => (opts?.inside?.(tx, ty) ? region : null),
    woodSkinFor: () => WOOD_SKINS[0]!,
    sink: new StructSink(),
  };
}

const build = (ctx: StructBuildCtx) => {
  const r = buildWallStructures(ctx);
  const buckets = ctx.sink.drain();
  const opaque = buckets.find((b) => b.kind === 'opaque');
  const cutout = buckets.find((b) => b.kind === 'cutout');
  return { r, opaque, cutout, buckets };
};

// ----------------------------------------------------- pure helpers

test('sideFace: u runs left→right seen from outside, normals point out', () => {
  const f: FaceEdge = { ax: 0, az: 0, bx: 0, bz: 0, ya: 0, yb: 0, H: 0, nx: 0, nz: 0 };
  const g: [number, number, number, number] = [1, 2, 3, 4];
  sideFace('S', 5, 7, g, 2.05, f);
  assert.deepEqual([f.ax, f.az, f.bx, f.bz, f.ya, f.yb, f.nz], [5, 8, 6, 8, 4, 3, 1]);
  sideFace('N', 5, 7, g, 2.05, f);
  assert.deepEqual([f.ax, f.az, f.bx, f.bz, f.ya, f.yb, f.nz], [6, 7, 5, 7, 2, 1, -1]);
  sideFace('E', 5, 7, g, 2.05, f);
  assert.deepEqual([f.ax, f.az, f.bx, f.bz, f.nx], [6, 8, 6, 7, 1]);
  sideFace('W', 5, 7, g, 2.05, f);
  assert.deepEqual([f.ax, f.az, f.bx, f.bz, f.nx], [5, 7, 5, 8, -1]);
});

test('THE WIDE LIGHT: singles ride 0.28..0.72, merged edges butt the seam', () => {
  assert.deepEqual(windowSpan(false, false), [0.28, 0.72]);
  assert.deepEqual(windowSpan(true, false), [0, 0.72]);
  assert.deepEqual(windowSpan(false, true), [0.28, 1]);
  assert.deepEqual(windowSpan(true, true), [0, 1]);
});

test('diagShape names the SOLID triangle: DiagNE = mass across N and E, hypotenuse facing SW', () => {
  const ne = diagShape('NE');
  assert.deepEqual(ne.edges, ['N', 'E']);
  assert.ok(ne.nx < 0 && ne.nz > 0);
  const sw = diagShape('SW');
  assert.deepEqual(sw.edges, ['S', 'W']);
  assert.ok(sw.nx > 0 && sw.nz < 0);
  for (const m of ['NE', 'NW', 'SE', 'SW'] as const) assert.equal(diagShape(m).tri.length, 3);
});

test('the course law is absolute: a taller face stacks more logs, never stretched ones', () => {
  const s = 48;
  const story = timberCourses(2.05 * s, s);
  const stub = timberCourses(0.62 * s, s);
  assert.ok(story.nLogs > stub.nLogs);
  assert.equal(story.nLogs, Math.round((2.05 * s - s * (0.22 + 0.11 + 0.13)) / (s * 0.42)));
  assert.ok(Math.abs(story.nLogs * story.logH + (story.nLogs - 1) * story.chinkG - story.spanPx) < 1e-6, 'logs and chink fill the span exactly');
});

// --------------------------------------------------- the wall prism

test('an isolated wall tile is a prism: four faces and a crown, all opaque', () => {
  const { r, opaque, cutout } = build(ctxOver([[G, G, G], [G, WS, G], [G, G, G]]));
  assert.equal(r.quads, 5);
  assert.equal(opaque?.triangles, 10);
  assert.equal(cutout, undefined);
});

test('THE SHARED-EDGE LAW: two run-mates never put a face on their shared edge', () => {
  const { r } = build(ctxOver([[G, G, G, G], [G, WS, WS, G], [G, G, G, G]]));
  // 3 faces + crown each.
  assert.equal(r.quads, 8);
});

test('a 5x5 house: crowns on every ring tile, faces only on the exposed sides', () => {
  const HOUSE = [
    [WS, WS, WS, WS, WS],
    [WS, G, G, G, WS],
    [WS, G, G, G, WS],
    [WS, G, G, G, WS],
    [WS, WS, WS, WS, WS],
  ];
  const { r, opaque } = build(ctxOver(HOUSE));
  // 16 ring tiles: 4 corners × (2 faces + crown) + 12 edges × (2 faces + crown) = 48.
  assert.equal(r.quads, 48);
  assert.ok(opaque);
  // Every vertex sits at ground or the crown.
  const ys = new Set<number>();
  for (let i = 1; i < opaque!.positions.length; i += 3) ys.add(+opaque!.positions[i]!.toFixed(3));
  assert.deepEqual([...ys].sort(), [0, 2.05]);
});

test('THE FACE IS LIT ON THE SOUTH, SHADED ELSEWHERE: the atlas keys confess the tones', () => {
  const ctx = ctxOver([[G, G, G], [G, WW, G], [G, G, G]]);
  build(ctx);
  const faceKeys = ctx.atlas.keys.filter((k) => k.startsWith('wf/'));
  assert.ok(faceKeys.some((k) => k.includes('/lit/')));
  assert.ok(faceKeys.some((k) => k.includes('/shaded/')));
  assert.ok(ctx.atlas.keys.some((k) => k.startsWith('cr/wood/')), 'a wood crown');
});

test('the building lifts with its elevation and follows the heightfield per corner', () => {
  const ctx = ctxOver([[G, G, G], [G, WS, G], [G, G, G]], { height: (wx) => (wx < 1.5 ? 1.35 : 2.7) });
  const { opaque } = build(ctx);
  const ys = new Set<number>();
  for (let i = 1; i < opaque!.positions.length; i += 3) ys.add(+opaque!.positions[i]!.toFixed(2));
  assert.ok(ys.has(1.35) && ys.has(2.7), 'west corners at one height, east at another');
  assert.ok(ys.has(+(1.35 + 2.05).toFixed(2)) && ys.has(+(2.7 + 2.05).toFixed(2)), 'the crown follows');
});

// ------------------------------------------------------- windows

test('TRUE GLASS: a window is a hole through both faces, with reveals and a mullion card', () => {
  const { r, opaque, cutout } = build(ctxOver([[G, G, G], [G, WIN, G], [G, G, G]]));
  // S + N faces: 4 pieces each; E + W whole; crown; sill + head + 2 jamb reveals; mullion card.
  assert.equal(r.quads, 8 + 2 + 1 + 4 + 1);
  assert.equal(cutout?.triangles, 2, 'one alpha-cut mullion card');
  // No opaque vertex lies inside the opening's band on the south face.
  const p = opaque!.positions;
  let inHole = 0;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!;
    const y = p[i + 1]!;
    const z = p[i + 2]!;
    if (z === 2 && x > 1.28 + 1e-6 && x < 1.72 - 1e-6 && y > WINDOW_SILL + 1e-6 && y < WINDOW_HEAD - 1e-6) inHole++;
  }
  assert.equal(inHole, 0);
});

test('THE WIDE LIGHT: consecutive windows merge — no inner reveal jambs, mullion posts at the seam', () => {
  const ctx = ctxOver([[G, G, G, G], [G, WIN, WIN, G], [G, G, G, G]]);
  const { r, cutout } = build(ctx);
  // Each: S/N faces 3 pieces (no inner pillar) = 6, one end face, crown, sill + head + ONE outer jamb reveal, card.
  assert.equal(r.quads, 2 * (6 + 1 + 1 + 3 + 1));
  assert.equal(cutout?.triangles, 4);
  assert.ok(ctx.atlas.keys.some((k) => k.startsWith('mul/') && k.includes('/01/')), 'the west light carries the seam post');
  assert.ok(ctx.atlas.keys.some((k) => k.startsWith('ww/') && k.includes('/01/')), 'merged-right dressing');
  assert.ok(ctx.atlas.keys.some((k) => k.startsWith('ww/') && k.includes('/10/')), 'merged-left dressing');
});

test('a window in a N-S run looks east-west', () => {
  const ctx = ctxOver([[G, WS, G], [G, WIN, G], [G, WS, G]]);
  const { cutout } = build(ctx);
  assert.equal(cutout?.triangles, 2);
  // The card stands mid-tile on x = 1.5.
  const xs = new Set<number>();
  for (let i = 0; i < cutout!.positions.length; i += 3) xs.add(cutout!.positions[i]!);
  assert.deepEqual([...xs], [1.5]);
});

// -------------------------------------------------------- doorways

test('a doorway is a tunnel: header + jambs on both framed faces, reveals, crown, and ONE hinged leaf', () => {
  doorLeaves.clear();
  const { r, opaque } = build(ctxOver([[G, G, G, G, G], [G, WS, DS, WS, G], [G, G, G, G, G]]));
  // Walls: 2 × (3 faces + crown) = 8. Door: S 3 + N 3 + header underside + 2 jamb reveals + crown = 10.
  assert.equal(r.quads, 18);
  assert.ok(opaque);
  assert.equal(doorLeaves.count, 1);
  const leaf = [...doorLeaves.states()][0]!.leaf;
  assert.equal(leaf.key, '2,1');
  assert.ok(Math.abs(leaf.hx - (2 + DOOR_JAMB)) < 1e-9, 'hinged on the west jamb');
  assert.equal(leaf.open, true, 'DoorwayStone stands open');
  assert.ok(Math.abs(leaf.w - (1 - 2 * DOOR_JAMB - 0.02)) < 1e-9);
  assert.ok(leaf.hz > 1.5, 'no room either side: the leaf hangs on the south face');
  assert.equal(leaf.oz, 1, 'and is thrown open outward, south');
});

test('the leaf hangs on the OUTDOOR side: a room to the south puts it on the north face', () => {
  doorLeaves.clear();
  build(ctxOver([[G, G, G, G, G], [G, WS, DSS, WS, G], [G, G, G, G, G]], { inside: (_tx, ty) => ty === 2 }));
  const leaf = [...doorLeaves.states()][0]!.leaf;
  assert.ok(leaf.hz < 1.5);
  assert.equal(leaf.oz, -1, 'outward is north');
  assert.equal(leaf.open, false, 'DoorwayStoneShut is shut');
});

test('a wide doorway merges E-W: jambs at the run ends only, a French pair sharing one key', () => {
  doorLeaves.clear();
  const { r } = build(ctxOver([[G, G, G, G, G, G], [G, WS, DSW, DSW, WS, G], [G, G, G, G, G, G]]));
  // Walls 8. Each door tile: S header + 1 jamb, N header + 1 jamb, underside, 1 jamb reveal, crown = 7.
  assert.equal(r.quads, 8 + 14);
  assert.equal(doorLeaves.count, 2);
  const [a, b] = [...doorLeaves.states()].map((s) => s.leaf);
  assert.equal(a!.key, b!.key);
  assert.ok(Math.abs(a!.w - ((2 - 2 * DOOR_JAMB) / 2 - 0.01)) < 1e-9);
  assert.equal(a!.sx, 1, 'west leaf lies east from its hinge');
  assert.equal(b!.sx, -1, 'east leaf lies west');
});

test('a side doorway stands edge-on: jambs on the E/W faces, the leaf hinged on the north jamb', () => {
  doorLeaves.clear();
  const { r } = build(ctxOver([[G, G, G], [G, WS, G], [G, DS, G], [G, WS, G], [G, G, G]]));
  // The door: E 3 + W 3 + underside + 2 reveals + crown = 10. The two wall
  // ends: the run ENDS at a side doorway (wallish law), so each shows all
  // four faces + crown = 5 — the face into the notch stands inside the
  // door tile's jamb/header mass, never seen.
  assert.equal(r.quads, 20);
  const leaf = [...doorLeaves.states()][0]!.leaf;
  assert.ok(Math.abs(leaf.hz - (2 + DOOR_JAMB)) < 1e-9);
  assert.equal(leaf.sz, 1, 'lies south along the wall when shut');
  assert.ok(leaf.hx < 1.5 && leaf.ox === -1, 'no room either side: hung on the west face, thrown open west');
});

// ------------------------------------------------------- diagonals

test('a diagonal is a triangular prism: two leg faces, the hypotenuse, a crown triangle', () => {
  const { r, opaque } = build(ctxOver([[G, G, G], [G, Tile.WallStoneDiagNE, G], [G, G, G]]));
  assert.equal(r.quads, 4);
  assert.equal(opaque?.triangles, 3 * 2 + 1);
  // The hypotenuse normal points south-west (the open triangle).
  const n = opaque!.normals;
  let sw = false;
  for (let i = 0; i < n.length; i += 3) if (n[i]! < 0 && n[i + 2]! > 0) sw = true;
  assert.ok(sw);
});

test('a diagonal joining a run drops its joined leg face', () => {
  const { r } = build(ctxOver([[G, G, G, G], [G, Tile.WallStoneDiagNE, WS, G], [G, G, G, G]]));
  // Diag: N leg + hyp + crown = 3; wall: 3 faces + crown = 4.
  assert.equal(r.quads, 7);
});

// --------------------------------------------------------- awnings

test('an awning over a wall host is a slab (top + under) and an alpha-cut skirt', () => {
  const { r, cutout } = build(ctxOver([[G, G, G], [G, WS, G], [G, AWN, G], [G, G, G]]));
  assert.equal(r.quads, 5 + 3);
  assert.equal(cutout?.triangles, 2);
  const p = cutout!.positions;
  const zs = new Set<number>();
  for (let i = 2; i < p.length; i += 3) zs.add(+p[i]!.toFixed(2));
  assert.deepEqual([...zs], [2.85], 'the skirt hangs at the rail, 0.85 out from the face');
});

test('an awning with no host north of it stands nowhere', () => {
  const { r } = build(ctxOver([[G, G, G], [G, G, G], [G, AWN, G], [G, G, G]]));
  assert.equal(r.quads, 0);
});

// --------------------------------------------------- wall-hung art

test('a wall-hung detail mints its own south-face variant, keyed by the detail', () => {
  const ctx = ctxOver([[G, G, G], [G, WS, G], [G, G, G]], { detail: [[0, 0, 0], [0, Detail.WallBanner, 0], [0, 0, 0]] });
  build(ctx);
  assert.ok(ctx.atlas.keys.some((k) => k.startsWith('wh/stone/') && k.includes(`/${Detail.WallBanner}/`)));
});

test('THE CURTAIN HAS ONE BUILDER: the garrison family is garrison.ts\'s, this lane lands nothing for it', () => {
  const { r } = build(ctxOver([[G, G, G], [G, Tile.WallGarrison, G], [G, G, G]]));
  assert.equal(r.quads, 0);
});
