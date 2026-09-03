import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { packTile } from './interiors.js';
import { collectVolume, type VolPoint } from './collectVolume.js';

/** A tiny grid: every cell is Grass unless placed; off a small box = off-map. */
function sampleOf(cells: Array<[number, number, Tile]>): (tx: number, ty: number) => Tile | undefined {
  const m = new Map<number, Tile>();
  for (const [x, y, t] of cells) m.set(packTile(x, y), t);
  return (tx: number, ty: number) =>
    Math.abs(tx) > 32 || Math.abs(ty) > 32 ? undefined : (m.get(packTile(tx, ty)) ?? Tile.Grass);
}

/** Place a rectangle of one tile kind at [x0..x1]×[y0..y1]. */
function rect(x0: number, y0: number, x1: number, y1: number, t: Tile): Array<[number, number, Tile]> {
  const out: Array<[number, number, Tile]> = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y, t]);
  return out;
}

/** Member set as a sorted, comparable list of "x,y" keys. */
function memberKeys(members: number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < members.length; i += 2) out.push(`${members[i]},${members[i + 1]}`);
  return out.sort();
}

/** A loop as a "x,y" string list — canonical (starts at min corner). */
function loopKeys(loop: VolPoint[]): string[] {
  return loop.map((p) => `${p.x},${p.y}`);
}

// classOf that treats a specific tile as its own class (exact-tile runs,
// the run-ring contract).
const exact = (t: Tile) => (u: Tile) => (u === t ? u : null);

test('single tile: members = itself, loop = its 4 corners', () => {
  const s = sampleOf([[5, 5, Tile.WallWood]]);
  const v = collectVolume(s, 5, 5, exact(Tile.WallWood));
  assert.ok(v);
  assert.deepEqual(memberKeys(v!.members), ['5,5']);
  assert.equal(v!.count, 1);
  assert.deepEqual({ ax: v!.ax, ay: v!.ay }, { ax: 5, ay: 5 });
  assert.deepEqual({ x0: v!.x0, y0: v!.y0, x1: v!.x1, y1: v!.y1 }, { x0: 5, y0: 5, x1: 5, y1: 5 });
  assert.equal(v!.perimeter.length, 1);
  // Corners walked clockwise (y-down) from the min corner (5,5):
  // NW→NE→SE→SW.
  assert.deepEqual(loopKeys(v!.perimeter[0]!), ['5,5', '6,5', '6,6', '5,6']);
});

test('straight E–W run: one outer rectangle loop (interior edges dropped)', () => {
  // Three tiles (2,3),(3,3),(4,3).
  const s = sampleOf(rect(2, 3, 4, 3, Tile.WallWood));
  const v = collectVolume(s, 3, 3, exact(Tile.WallWood));
  assert.ok(v);
  assert.deepEqual(memberKeys(v!.members), ['2,3', '3,3', '4,3']);
  // Anchor = lexicographic min (min y then x) = (2,3).
  assert.deepEqual({ ax: v!.ax, ay: v!.ay }, { ax: 2, ay: 3 });
  assert.equal(v!.perimeter.length, 1);
  // A clean 4-corner rectangle spanning x∈[2,5], y∈[3,4] — collinear
  // top/bottom midpoints merged, so no seams for A1/A2 to double-round.
  assert.deepEqual(loopKeys(v!.perimeter[0]!), ['2,3', '5,3', '5,4', '2,4']);
});

test('straight N–S run: one outer rectangle loop', () => {
  const s = sampleOf(rect(7, 1, 7, 3, Tile.WallWood));
  const v = collectVolume(s, 7, 2, exact(Tile.WallWood));
  assert.ok(v);
  assert.deepEqual(memberKeys(v!.members), ['7,1', '7,2', '7,3']);
  assert.deepEqual(loopKeys(v!.perimeter[0]!), ['7,1', '8,1', '8,4', '7,4']);
});

test('L-shape: correct concave loop with 6 corners', () => {
  // Cells (0,0),(1,0) across the top and (0,1) down the left — an L.
  const s = sampleOf([
    [0, 0, Tile.WallWood],
    [1, 0, Tile.WallWood],
    [0, 1, Tile.WallWood],
  ]);
  const v = collectVolume(s, 0, 0, exact(Tile.WallWood));
  assert.ok(v);
  assert.deepEqual(memberKeys(v!.members), ['0,0', '0,1', '1,0']);
  assert.equal(v!.perimeter.length, 1);
  // The concave loop: NW(0,0) → NE(2,0) → down(2,1) → in to the reflex
  // corner (1,1) → down(1,2) → SW(0,2), back to start. Six corners; the
  // reflex vertex (1,1) is the concavity.
  assert.deepEqual(loopKeys(v!.perimeter[0]!), ['0,0', '2,0', '2,1', '1,1', '1,2', '0,2']);
});

test('interior shared edges excluded: a solid 3×3 block is one rectangle', () => {
  const s = sampleOf(rect(0, 0, 2, 2, Tile.WallWood));
  const v = collectVolume(s, 1, 1, exact(Tile.WallWood));
  assert.ok(v);
  assert.equal(v!.count, 9);
  assert.equal(v!.perimeter.length, 1);
  // No interior seams survive — just the outer 4-corner rectangle.
  assert.deepEqual(loopKeys(v!.perimeter[0]!), ['0,0', '3,0', '3,3', '0,3']);
});

test('different tile kinds do not merge (exact-tile membership)', () => {
  // A wood tile flanked by stone — the run-ring contract must not join.
  const s = sampleOf([
    [0, 0, Tile.WallStone],
    [1, 0, Tile.WallWood],
    [2, 0, Tile.WallStone],
  ]);
  const v = collectVolume(s, 1, 0, exact(Tile.WallWood));
  assert.ok(v);
  assert.deepEqual(memberKeys(v!.members), ['1,0']);
});

test('one shared class merges mixed wall kinds (the A2 wall-run contract)', () => {
  const wallClass = (t: Tile) =>
    t === Tile.WallWood || t === Tile.WallStone ? 1 : null;
  const s = sampleOf([
    [0, 0, Tile.WallStone],
    [1, 0, Tile.WallWood],
    [2, 0, Tile.WallStone],
  ]);
  const v = collectVolume(s, 1, 0, wallClass);
  assert.ok(v);
  assert.deepEqual(memberKeys(v!.members), ['0,0', '1,0', '2,0']);
  assert.deepEqual(loopKeys(v!.perimeter[0]!), ['0,0', '3,0', '3,1', '0,1']);
});

test('cap: an oversized component returns null (→ render plainly)', () => {
  const s = sampleOf(rect(0, 0, 4, 0, Tile.WallWood)); // 5 tiles
  assert.equal(collectVolume(s, 0, 0, exact(Tile.WallWood), { cap: 3 }), null);
  // Within cap it still collects.
  const v = collectVolume(s, 0, 0, exact(Tile.WallWood), { cap: 5 });
  assert.ok(v);
  assert.equal(v!.count, 5);
});

test('seed not a member returns null', () => {
  const s = sampleOf([[0, 0, Tile.Grass]]);
  assert.equal(collectVolume(s, 0, 0, exact(Tile.WallWood)), null);
});

test('perimeter:false skips the loop (hot run-ring path)', () => {
  const s = sampleOf(rect(0, 0, 2, 0, Tile.WallWood));
  const v = collectVolume(s, 0, 0, exact(Tile.WallWood), { perimeter: false });
  assert.ok(v);
  assert.equal(v!.count, 3);
  assert.deepEqual(v!.perimeter, []);
});

test('heightAt hook echoes back; defaults to flat 0', () => {
  const s = sampleOf([[0, 0, Tile.WallWood]]);
  const flat = collectVolume(s, 0, 0, exact(Tile.WallWood));
  assert.equal(flat!.heightAt(0, 0), 0);
  const tall = collectVolume(s, 0, 0, exact(Tile.WallWood), {
    heightAt: (tx, ty) => tx + ty + 3,
  });
  assert.equal(tall!.heightAt(2, 5), 10);
});

test('two disjoint components each seed their own volume', () => {
  const s = sampleOf([
    [0, 0, Tile.WallWood],
    [5, 5, Tile.WallWood],
  ]);
  const a = collectVolume(s, 0, 0, exact(Tile.WallWood));
  const b = collectVolume(s, 5, 5, exact(Tile.WallWood));
  assert.deepEqual(memberKeys(a!.members), ['0,0']);
  assert.deepEqual(memberKeys(b!.members), ['5,5']);
});

test('pooled scratch is reused (members aliases the scratch array)', () => {
  const s = sampleOf(rect(0, 0, 2, 0, Tile.WallWood));
  const scratch = { members: [] as number[], seen: new Set<number>(), queue: [] as number[] };
  const v = collectVolume(s, 0, 0, exact(Tile.WallWood), { scratch, perimeter: false });
  assert.equal(v!.members, scratch.members);
  assert.equal(v!.count, 3);
});

// ── THE ONE RENDER A2: the wall-run coalesce contract ─────────────────────
// The wall painter (emitWallVolume) coalesces a run by MATERIAL class, so a
// straight run of mixed wall tiles (incl. windowed variants) reads as ONE
// rectangular crown loop — the property `wallCrownRunItem` relies on for its
// single continuous topPlane fill + the `poly.length === 4` dressing guard,
// and `emitWallVolume`'s thin-run test (`x1===x0 || y1===y0`).
const wallMat = (t: Tile): number | null => {
  const m = t === Tile.WallWoodWindow ? Tile.WallWood : t === Tile.WallStoneWindow ? Tile.WallStone : t;
  if (m === Tile.WallWood) return 0;
  if (m === Tile.WallStone) return 1;
  return null;
};

test('A2: a straight E-W wall run (windowed variant included) coalesces to one 4-corner loop', () => {
  const s = sampleOf([
    [3, 5, Tile.WallWood],
    [4, 5, Tile.WallWoodWindow], // a window mid-run must NOT split the material class
    [5, 5, Tile.WallWood],
    [6, 5, Tile.WallWood],
  ]);
  const v = collectVolume(s, 3, 5, wallMat);
  assert.ok(v, 'run collects');
  assert.equal(v!.count, 4);
  // Thin run: single row ⇒ y0 === y1.
  assert.equal(v!.y0, v!.y1);
  assert.notEqual(v!.x0, v!.x1);
  // One exposed loop, a rectangle: exactly 4 corners after collinear-merge.
  assert.equal(v!.perimeter.length, 1);
  assert.equal(v!.perimeter[0]!.length, 4);
  assert.deepEqual(loopKeys(v!.perimeter[0]!), ['3,5', '7,5', '7,6', '3,6']);
});

test('A2: a wood run does NOT coalesce across a stone tile (material class splits)', () => {
  const s = sampleOf([
    [3, 5, Tile.WallWood],
    [4, 5, Tile.WallStone], // different material — a class boundary
    [5, 5, Tile.WallWood],
  ]);
  const v = collectVolume(s, 3, 5, wallMat);
  assert.deepEqual(memberKeys(v!.members), ['3,5']); // the wood seed stops at stone
});

test('A2: a building footprint is NOT a thin run (both extents > 0)', () => {
  const s = sampleOf(rect(2, 2, 5, 4, Tile.WallStone));
  const v = collectVolume(s, 2, 2, wallMat);
  assert.notEqual(v!.x0, v!.x1);
  assert.notEqual(v!.y0, v!.y1); // ⇒ emitWallVolume falls back to per-tile
});
