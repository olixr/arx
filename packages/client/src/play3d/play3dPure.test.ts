import test from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE } from '@arx/shared';
import { chunkOf, outsideRing, packChunk, ringAround, unpackCx, unpackCy } from './chunkRing.js';
import { buildHeightfield, cornerLevels, heightAtPoint } from './heightfield.js';
import { ShelfPacker } from './atlasPack.js';
import { ORBIT_LIMITS, clampOrbit, dollyBy, easeAngle, easeTowards, moveOnGround, orbitOffset } from './orbit.js';

// ---------------------------------------------------------------- ring

test('chunk keys pack and unpack signed pairs', () => {
  for (const [cx, cy] of [
    [0, 0],
    [-1, -1],
    [-5, 7],
    [1000, -1000],
  ] as const) {
    const k = packChunk(cx, cy);
    assert.equal(unpackCx(k), cx);
    assert.equal(unpackCy(k), cy);
  }
  assert.notEqual(packChunk(-1, 0), packChunk(0, -1));
  assert.equal(chunkOf(-1), -1);
  assert.equal(chunkOf(CHUNK_SIZE), 1);
});

test('ringAround deals nearest-first and reuses its array', () => {
  const out = ringAround(3, -2, 2, []);
  assert.equal(out.length, 25);
  assert.deepEqual({ cx: out[0]!.cx, cy: out[0]!.cy }, { cx: 3, cy: -2 });
  for (let i = 1; i < out.length; i++) assert.ok(out[i]!.d2 >= out[i - 1]!.d2);
  const before = new Set(out);
  ringAround(0, 0, 1, out);
  assert.equal(out.length, 9);
  for (const e of out) assert.ok(before.has(e), 'entries are mutated in place, not re-minted');
  assert.ok(outsideRing(5, 0, 0, 0, 3));
  assert.ok(!outsideRing(3, -3, 0, 0, 3));
});

// --------------------------------------------------------- heightfield

const RAMP = 35;

function field(levels: number[][], ramps: Array<[number, number]> = []) {
  const at = (tx: number, ty: number): number => levels[ty]?.[tx] ?? 0;
  const isRamp = (tx: number, ty: number): boolean => ramps.some(([x, y]) => x === tx && y === ty);
  return { at, isRamp };
}

test('flat chunk: one quad per tile, no vertical faces, unit-square uvs inside the gutter', () => {
  const { at, isRamp } = field([]);
  const m = buildHeightfield({ cx: 0, cy: 0, size: 4, levelAt: at, isRamp, levelH: 1.35, px: 10, gutter: 4 });
  assert.equal(m.vertexCount, 4 * 4 * 4);
  assert.equal(m.indices.length, 4 * 4 * 6);
  assert.equal(m.faceCount, 0);
  assert.equal(m.maxY, 0);
  // First tile's nw uv sits at the gutter inset.
  const canvas = 4 * 10 + 8;
  assert.ok(Math.abs(m.uvs[0]! - 4 / canvas) < 1e-6);
  assert.ok(Math.abs(m.uvs[1]! - (1 - 4 / canvas)) < 1e-6);
  // Every normal points up.
  for (let i = 0; i < m.normals.length; i += 3) assert.equal(m.normals[i + 1], 1);
});

test('a plateau emits vertical faces on every exposed edge, owned by the high tile', () => {
  // 3x3 with a raised centre tile at level 2.
  const { at, isRamp } = field([
    [0, 0, 0],
    [0, 2, 0],
    [0, 0, 0],
  ]);
  const m = buildHeightfield({ cx: 0, cy: 0, size: 3, levelAt: at, isRamp, levelH: 1.35, px: 8, gutter: 4 });
  assert.equal(m.faceCount, 4);
  assert.equal(m.vertexCount, 9 * 4 + 4 * 4);
  assert.ok(Math.abs(m.maxY - 2.7) < 1e-6);
  // The four faces' normals are the four outward horizontals.
  const seen = new Set<string>();
  for (let vtx = 0; vtx < m.vertexCount; vtx++) {
    if (m.normals[vtx * 3 + 1] === 1) continue; // a top
    seen.add(`${m.normals[vtx * 3]},${m.normals[vtx * 3 + 1]},${m.normals[vtx * 3 + 2]}`);
  }
  assert.deepEqual([...seen].sort(), ['-1,0,0', '0,0,-1', '0,0,1', '1,0,0']);
});

test('a chunk-border step is emitted once, by whichever side is higher', () => {
  // Chunk 0 (size 2) sits at level 1; the world east of it is level 0.
  const at = (tx: number): number => (tx < 2 ? 1 : 0);
  const isRamp = (): boolean => false;
  const high = buildHeightfield({ cx: 0, cy: 0, size: 2, levelAt: at, isRamp, levelH: 1, px: 8, gutter: 4 });
  const low = buildHeightfield({ cx: 1, cy: 0, size: 2, levelAt: at, isRamp, levelH: 1, px: 8, gutter: 4 });
  // High chunk: east faces on its two east tiles + north/south/west
  // faces where the field outside (level 1 too) — none: the sampler
  // says everything west of x=2 is level 1, so only the east edge steps.
  assert.equal(high.faceCount, 2);
  assert.equal(low.faceCount, 0);
});

test('ramp tiles slope toward their high neighbour and height sampling is bilinear', () => {
  // Row: [hi=1][ramp][lo=0] with the ramp's own level 0.
  const { at, isRamp } = field([[1, 0, 0]], [[1, 0]]);
  const c = cornerLevels(1, 0, at, isRamp, new Float64Array(4));
  assert.deepEqual(Array.from(c), [1, 0, 0, 1]); // nw, sw high (west side)
  const scratch = new Float64Array(4);
  assert.ok(Math.abs(heightAtPoint(1.0, 0.5, at, isRamp, 2, scratch) - 2) < 1e-9);
  assert.ok(Math.abs(heightAtPoint(1.5, 0.5, at, isRamp, 2, scratch) - 1) < 1e-9);
  assert.ok(Math.abs(heightAtPoint(2.0, 0.5, at, isRamp, 2, scratch) - 0) < 1e-9);
  // The ramp's top normal tilts toward +x (downhill east).
  const m = buildHeightfield({ cx: 0, cy: 0, size: 3, levelAt: at, isRamp, levelH: 1, px: 8, gutter: 4 });
  // The ramp's top is the one quad whose normal is neither up nor flat.
  let rampVtx = -1;
  for (let vtx = 0; vtx < m.vertexCount; vtx++) {
    const ny = m.normals[vtx * 3 + 1]!;
    if (ny > 0.01 && ny < 0.999) {
      rampVtx = vtx;
      break;
    }
  }
  assert.ok(rampVtx >= 0, 'a sloped top exists');
  assert.ok(m.normals[rampVtx * 3]! > 0.5, 'ramp normal leans +x');
  assert.ok(m.normals[rampVtx * 3 + 1]! > 0.5, 'and still points up');
  // No face is emitted BETWEEN the high tile and the ramp (they meet),
  // and the ramp/low join is flush. The high tile's north/south/west
  // edges step (3), and the ramp's own north/south flanks are exposed
  // wedges (2) — a ramp has sides too.
  assert.equal(m.faceCount, 5);
  assert.equal(RAMP, 35);
});

// --------------------------------------------------------------- atlas

test('shelf packer places rects in rows, pads them, and refuses what cannot fit', () => {
  const p = new ShelfPacker(110, 40, 2);
  const a = p.insert(30, 10)!;
  const b = p.insert(30, 20)!;
  const c = p.insert(30, 10)!;
  assert.deepEqual([a.x, a.y], [2, 2]);
  assert.deepEqual([b.x, b.y], [36, 2]);
  assert.deepEqual([c.x, c.y], [70, 2]);
  // Fourth 30-wide rect opens a shelf under the tallest (20 + 4 pad).
  const d = p.insert(30, 10)!;
  assert.deepEqual([d.x, d.y], [2, 26]);
  assert.equal(p.insert(30, 14), null, 'too tall for the remaining height');
  assert.equal(p.insert(200, 1), null, 'wider than the page');
  assert.ok(p.fill > 0 && p.fill < 1);
});

// --------------------------------------------------------------- orbit

test('orbit clamps pitch/dist, wraps yaw, and yaw 0 sits south of the target', () => {
  const p = clampOrbit({ yaw: Math.PI * 1.5, pitch: 3, dist: 0 });
  assert.equal(p.pitch, ORBIT_LIMITS.pitchMax);
  assert.equal(p.dist, ORBIT_LIMITS.distMin);
  assert.ok(Math.abs(p.yaw + Math.PI / 2) < 1e-9);
  const off = orbitOffset({ yaw: 0, pitch: Math.PI / 4, dist: 10 }, { x: 0, y: 0, z: 0 });
  assert.ok(off.z > 0 && off.y > 0 && Math.abs(off.x) < 1e-9);
});

test('eases never overshoot and the angular ease takes the short arc', () => {
  let v = 0;
  for (let i = 0; i < 100; i++) v = easeTowards(v, 1, 8, 1 / 60);
  assert.ok(v > 0.99 && v <= 1);
  const a = easeAngle(Math.PI - 0.1, -Math.PI + 0.1, 100, 1);
  assert.ok(Math.abs(Math.atan2(Math.sin(a - (-Math.PI + 0.1)), Math.cos(a - (-Math.PI + 0.1)))) < 1e-6);
  assert.ok(dollyBy(10, 1) > 10 && dollyBy(10, -1) < 10);
});

test('WASD is camera-relative: forward at yaw 0 is north (-z)', () => {
  const o = { x: 0, z: 0 };
  moveOnGround(0, 0, 1, o);
  assert.ok(Math.abs(o.x) < 1e-9 && o.z < -0.99);
  moveOnGround(0, 1, 0, o);
  assert.ok(o.x > 0.99);
  moveOnGround(Math.PI / 2, 0, 1, o);
  assert.ok(o.x < -0.99 && Math.abs(o.z) < 1e-9, 'yawed a quarter turn, forward is -x');
  moveOnGround(0, 0, 0, o);
  assert.deepEqual(o, { x: 0, z: 0 });
});

// ------------------------------------------------------- S2: the pick

import { pickGround, type PickHit } from './pick.js';
import { kindKey, type BodyKind } from './entityBillboard.js';
import { elevLevels } from './ground.js';
import type { ViewAdapter } from '../ui/viewAdapter.js';
import type { Renderer } from '../render/renderer.js';

/** THE ONE SEAM: the 2D Renderer must satisfy the ViewAdapter structurally. */
const _rendererIsAView: (r: Renderer) => ViewAdapter = (r) => r;
void _rendererIsAView;

test('pickGround: a ray down onto a flat plane lands where the ray crosses y=0', () => {
  const out: PickHit = { x: 0, y: 0, z: 0, t: -1 };
  // From (0, 10, 0) toward +x and down at 45°: crosses y=0 at x=10, z=0.
  const k = Math.SQRT1_2;
  const hit = pickGround({ ox: 0, oy: 10, oz: 0, dx: k, dy: -k, dz: 0 }, () => 0, 100, out);
  assert.equal(hit, true);
  assert.ok(Math.abs(out.x - 10) < 0.02, `x ${out.x}`);
  assert.ok(Math.abs(out.y) < 0.02, `y ${out.y}`);
  assert.ok(Math.abs(out.t - 10 * Math.SQRT2) < 0.03);
});

test('pickGround: a plateau is hit on its top, and a sky ray misses', () => {
  const out: PickHit = { x: 0, y: 0, z: 0, t: -1 };
  // Ground rises to 2 for x >= 5.
  const h = (x: number): number => (x >= 5 ? 2 : 0);
  const k = Math.SQRT1_2;
  assert.equal(pickGround({ ox: 0, oy: 6, oz: 0, dx: k, dy: -k, dz: 0 }, h, 100, out), true);
  // Crosses y=2 at x=4 (still low ground) so continues to the face at x=5, y=1 → lands at x≈5.
  assert.ok(out.x >= 4.9 && out.x <= 5.3, `x ${out.x}`);
  assert.equal(pickGround({ ox: 0, oy: 6, oz: 0, dx: k, dy: k, dz: 0 }, h, 50, out), false);
  assert.equal(out.t, -1);
});

test('kindKey: the same kit is the same key; a weapon or cape change is a new one', () => {
  const a: BodyKind = { body: 'humanoid', isOwn: false, bodyColor: '#a03030', weaponItem: 'iron_sword' };
  const b: BodyKind = { body: 'humanoid', isOwn: false, bodyColor: '#a03030', weaponItem: 'iron_sword' };
  const c: BodyKind = { ...a, weaponItem: 'oak_bow' };
  const d: BodyKind = { ...a, capeId: 'wolf_pelt_cloak' };
  const e: BodyKind = { body: 'beast', defId: 'wolf', radius: 0.35, color: '#777', speed: 3 };
  assert.equal(kindKey(a), kindKey(b));
  assert.notEqual(kindKey(a), kindKey(c));
  assert.notEqual(kindKey(a), kindKey(d));
  assert.notEqual(kindKey(a), kindKey(e));
});

test('elevLevels: the 2D level list — min..max, level 0 only when pits exist', () => {
  assert.deepEqual(elevLevels(new Int8Array([0, 0, 1, 2])), [1, 2]);
  assert.deepEqual(elevLevels(new Int8Array([-1, 0, 1])), [-1, 0, 1]);
  assert.deepEqual(elevLevels(new Int8Array([0, 0])), []);
});
