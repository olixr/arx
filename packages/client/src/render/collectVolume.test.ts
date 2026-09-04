import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { packTile } from './interiors.js';
import { collectVolume, crownSpans, type VolPoint } from './collectVolume.js';

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

// ── A2b: crownSpans — per-edge crown partition (small bbox, shared corners) ──

/** Flatten a member key list "x,y" back to the flat [x,y,…] crownSpans wants. */
function flatMembers(cells: Array<[number, number, Tile]>): number[] {
  const out: number[] = [];
  for (const [x, y] of cells) out.push(x, y);
  return out;
}

/** A hollow ring of one tile kind: rect [x0..x1]×[y0..y1] minus its interior. */
function ring(x0: number, y0: number, x1: number, y1: number, t: Tile): Array<[number, number, Tile]> {
  const out: Array<[number, number, Tile]> = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (x === x0 || x === x1 || y === y0 || y === y1) out.push([x, y, t]);
  return out;
}

import type { CrownSpan } from './collectVolume.js';

/** span extent in tile coords: [w, h] where a 1-tile-thick strip is 1 in one axis. */
function spanExtent(sp: CrownSpan): { w: number; h: number } {
  return { w: sp.x1 - sp.x0 + 1, h: sp.y1 - sp.y0 + 1 };
}

/** Every tile the spans cover, as a sorted key set — proves the union. */
function coverKeys(spans: CrownSpan[]): string[] {
  const s = new Set<string>();
  for (const sp of spans)
    for (let y = sp.y0; y <= sp.y1; y++) for (let x = sp.x0; x <= sp.x1; x++) s.add(`${x},${y}`);
  return [...s].sort();
}

/** The 4 tile-corners of a span rect (NW,NE,SE,SW), as "x,y" keys. */
function spanCorners(sp: CrownSpan): string[] {
  return [`${sp.x0},${sp.y0}`, `${sp.x1 + 1},${sp.y0}`, `${sp.x1 + 1},${sp.y1 + 1}`, `${sp.x0},${sp.y1 + 1}`];
}

test('crownSpans: thin E–W run → one horizontal span covering the whole run', () => {
  const members = flatMembers(rect(2, 3, 6, 3, Tile.WallWood));
  const spans = crownSpans(members);
  assert.equal(spans.length, 1);
  assert.deepEqual(spanExtent(spans[0]!), { w: 5, h: 1 }); // 5 wide, 1 deep
  assert.deepEqual(coverKeys(spans), memberKeys(members));
});

test('crownSpans: thin N–S run → one vertical span covering the whole column', () => {
  const members = flatMembers(rect(4, 2, 4, 7, Tile.WallWood));
  const spans = crownSpans(members);
  assert.equal(spans.length, 1);
  assert.deepEqual(spanExtent(spans[0]!), { w: 1, h: 6 }); // 1 wide, 6 deep
  assert.deepEqual(coverKeys(spans), memberKeys(members));
});

test('crownSpans: a building footprint ring → 4 small edge spans, union = the ring', () => {
  const members = flatMembers(ring(2, 2, 8, 6, Tile.WallStone)); // 7×5 ring
  const spans = crownSpans(members);
  // Top row, bottom row (horizontal); the two side columns' middles (vertical).
  assert.equal(spans.length, 4);
  // No span spans the whole footprint bbox — each is a thin strip.
  for (const sp of spans) {
    const { w, h } = spanExtent(sp);
    assert.ok(Math.min(w, h) === 1, `span is a 1-tile-thick strip, got ${w}×${h}`);
    assert.ok(w < 7 || h === 1, 'no span balloons to the footprint bbox');
  }
  // The spans cover EXACTLY the wall tiles — never the enclosed interior.
  assert.deepEqual(coverKeys(spans), memberKeys(members));
  assert.ok(!coverKeys(spans).includes('5,4'), 'interior floor tile is never crowned');
});

test('crownSpans: adjacent spans SHARE identical corner coords (seam-free)', () => {
  const members = flatMembers(ring(2, 2, 8, 6, Tile.WallStone));
  const spans = crownSpans(members);
  // A shared world corner appears in ≥2 spans with the SAME integer coords —
  // projected once → the same device pixel → no seam between the crown pieces.
  const seen = new Map<string, number>();
  for (const sp of spans) for (const c of spanCorners(sp)) seen.set(c, (seen.get(c) ?? 0) + 1);
  // The top-left wall corner (2,2)'s SW corner (2,3) is shared by the top
  // horizontal span and the left vertical span.
  assert.ok((seen.get('2,3') ?? 0) >= 2, 'the NW seam corner is shared by two spans');
  assert.ok((seen.get('9,3') ?? 0) >= 2, 'the NE seam corner is shared by two spans');
});

test('crownSpans: an L-shape covers each tile exactly once', () => {
  // Horizontal arm (2..6,3) + vertical arm (6,3..7).
  const cells = [...rect(2, 3, 6, 3, Tile.WallWood), ...rect(6, 4, 6, 7, Tile.WallWood)];
  const spans = crownSpans(flatMembers(cells));
  assert.deepEqual(coverKeys(spans), memberKeys(flatMembers(cells)));
});

// ── A2c: crownSpans on a GARRISON curtain run (the crenellation-span path) ──

test('crownSpans: a thin garrison curtain run → ONE horizontal span (crenellation tiles unbroken)', () => {
  // A straight E–W garrison curtain is one class of tiles; the crenellation
  // draw walks the ONE span at world tooth-phase, so the toothed top is
  // continuous across the run (no per-tile segmentation).
  const members = flatMembers(rect(10, 5, 17, 5, Tile.WallGarrison));
  const spans = crownSpans(members);
  assert.equal(spans.length, 1);
  assert.deepEqual(spanExtent(spans[0]!), { w: 8, h: 1 });
  assert.deepEqual(coverKeys(spans), memberKeys(members));
});

test('crownSpans: a thick garrison rampart → per-row strips, union = the rampart, no bbox balloon', () => {
  // A 6×2 rampart: two horizontal row spans, each a 1-tile-thick strip.
  const members = flatMembers(rect(10, 5, 15, 6, Tile.WallGarrison));
  const spans = crownSpans(members);
  for (const sp of spans) {
    const { w, h } = spanExtent(sp);
    assert.ok(Math.min(w, h) === 1, `span is a 1-tile-thick strip, got ${w}×${h}`);
  }
  assert.deepEqual(coverKeys(spans), memberKeys(members));
});

// ── A2c: diagSpans — the 45° (diagonal) run partition ──────────────────────

/** A 45° staircase of `n` same-mass diag tiles from (x,y) stepping by (dx,dy). */
function diagRun(x: number, y: number, dx: number, dy: number, n: number, t: Tile): Array<[number, number, Tile]> {
  const out: Array<[number, number, Tile]> = [];
  for (let i = 0; i < n; i++) out.push([x + dx * i, y + dy * i, t]);
  return out;
}

import { diagSpans } from './collectVolume.js';

test('diagSpans: a 45° NE staircase → one 1×1 span per member, union = the run', () => {
  // NE mass runs along the NW–SE diagonal: step (1,1).
  const cells = diagRun(4, 4, 1, 1, 5, Tile.WallStoneDiagNE);
  const members = flatMembers(cells);
  const spans = diagSpans(members);
  assert.equal(spans.length, 5);
  for (const sp of spans) assert.deepEqual(spanExtent(sp), { w: 1, h: 1 }); // tiny bbox, no blowup
  assert.deepEqual(coverKeys(spans), memberKeys(members));
});

test('diagSpans: a 45° NW staircase (step 1,-1) → per-member spans, union = the run', () => {
  const cells = diagRun(4, 10, 1, -1, 4, Tile.WallGarrisonDiagNW);
  const members = flatMembers(cells);
  const spans = diagSpans(members);
  assert.equal(spans.length, 4);
  assert.deepEqual(coverKeys(spans), memberKeys(members));
});

test('diagSpans: consecutive members SHARE exactly one tile-corner (seam-free arris)', () => {
  // Tiles (x,y) and (x+1,y+1) own unit squares that touch at the SINGLE corner
  // (x+1,y+1). Projected once, that shared corner is one device pixel → the
  // hypotenuse arrises of adjacent members meet with no seam.
  const cells = diagRun(4, 4, 1, 1, 3, Tile.WallStoneDiagNE);
  const spans = diagSpans(cells.flatMap(([x, y]) => [x, y]));
  const cornersOf = (sp: CrownSpan): Set<string> =>
    new Set(spanCorners(sp));
  for (let i = 0; i < spans.length - 1; i++) {
    const a = cornersOf(spans[i]!);
    const b = cornersOf(spans[i + 1]!);
    const shared = [...a].filter((c) => b.has(c));
    assert.equal(shared.length, 1, `members ${i}/${i + 1} share exactly one corner, got ${shared.length}`);
  }
});

test('diagSpans: a lone 45° corner → a single 1×1 span (equivalent to per-tile)', () => {
  const spans = diagSpans([7, 7]);
  assert.equal(spans.length, 1);
  assert.deepEqual(spanExtent(spans[0]!), { w: 1, h: 1 });
  assert.deepEqual(coverKeys(spans), ['7,7']);
});

// ── A4b: hedges through the crown-span path (corners / tees / garden RINGS) ──
//
// A4 coalesced only straight hedge runs / solid blocks; A4b routes a hedge
// CORNER, TEE and garden-border RING through the SAME `collectVolume` →
// `crownSpans` machinery walls/garrison use, so every edge coalesces
// seam-free with no per-tile seam and no bbox-spanning item (the A2b perf
// lesson). The hedge coalesce class is `Tile.Hedge → 0` (mirrors the
// renderer's `hedgeMatClass`); a diagonal / gate maps to null and never joins.
const hedgeClass = (t: Tile) => (t === Tile.Hedge ? 0 : null);

test('hedge RING (garden border): collectVolume → hollow ring, crownSpans → 4 thin edge spans', () => {
  // A herb-garden border like Amberford's (~world 537,-25): a 1-tile-thick
  // hollow rectangle of Tile.Hedge (in the test grid's ±32 box).
  const cells = ring(2, 2, 7, 7, Tile.Hedge); // 6×6 border ring, hole 4×4
  const s = sampleOf(cells);
  const vol = collectVolume(s, 2, 2, hedgeClass, { perimeter: true });
  assert.ok(vol, 'the hedge ring floods as one component');
  // The hollow interior is not a member — the ring is genuinely 1 tile thick.
  assert.equal(vol!.count, cells.length);
  assert.ok(!memberKeys(vol!.members).includes('4,4'), 'interior herb bed is not a hedge member');
  // Two boundary loops (outer + the hole) — proof it is a real ring.
  assert.equal(vol!.perimeter.length, 2);
  const spans = crownSpans(vol!.members);
  // Top row + bottom row (horizontal) + the two side columns' middles (vertical).
  assert.equal(spans.length, 4);
  for (const sp of spans) {
    const { w, h } = spanExtent(sp);
    assert.ok(Math.min(w, h) === 1, `each ring edge is a 1-tile-thick strip, got ${w}×${h}`);
    assert.ok(w < 6 || h === 1, 'no span balloons to the ring bbox (the 30× A2b blowup)');
  }
  // The spans crown EXACTLY the hedge tiles — never the enclosed herb bed.
  assert.deepEqual(coverKeys(spans), memberKeys(vol!.members));
  assert.ok(!coverKeys(spans).includes('4,4'), 'the open interior is never crowned');
});

test('hedge RING: adjacent edge spans SHARE identical corner coords (seam-free join)', () => {
  const cells = ring(2, 2, 7, 7, Tile.Hedge);
  const vol = collectVolume(sampleOf(cells), 2, 2, hedgeClass, { perimeter: true });
  const spans = crownSpans(vol!.members);
  const seen = new Map<string, number>();
  for (const sp of spans) for (const c of spanCorners(sp)) seen.set(c, (seen.get(c) ?? 0) + 1);
  // The ring's NW corner tile (2,2) has SW corner (2,3), shared by the top
  // horizontal edge span and the left vertical edge span → one projected device
  // pixel → the crown/faces of the two edges abut with no seam.
  assert.ok((seen.get('2,3') ?? 0) >= 2, 'the NW join corner is shared by two spans');
  assert.ok((seen.get('8,3') ?? 0) >= 2, 'the NE join corner is shared by two spans');
});

test('hedge CORNER (L): crownSpans covers each tile once, no bbox balloon', () => {
  // An L: a west→east arm meeting a north→south arm at the corner tile.
  const cells = [...rect(2, 3, 6, 3, Tile.Hedge), ...rect(6, 4, 6, 7, Tile.Hedge)];
  const vol = collectVolume(sampleOf(cells), 2, 3, hedgeClass, { perimeter: true });
  assert.ok(vol);
  const spans = crownSpans(vol!.members);
  for (const sp of spans) {
    const { w, h } = spanExtent(sp);
    assert.ok(Math.min(w, h) === 1, `an L arm is a 1-tile-thick strip, got ${w}×${h}`);
  }
  assert.deepEqual(coverKeys(spans), memberKeys(vol!.members));
});

test('hedge TEE: crownSpans covers each tile exactly once, every span thin', () => {
  // A tee: a 5-wide E–W bar (x 2..6, y 4) with a stem dropping south (x 4, y 5..7).
  const cells = [...rect(2, 4, 6, 4, Tile.Hedge), ...rect(4, 5, 4, 7, Tile.Hedge)];
  const vol = collectVolume(sampleOf(cells), 2, 4, hedgeClass, { perimeter: true });
  assert.ok(vol);
  const spans = crownSpans(vol!.members);
  for (const sp of spans) {
    const { w, h } = spanExtent(sp);
    assert.ok(Math.min(w, h) === 1, `each tee arm is a 1-tile-thick strip, got ${w}×${h}`);
  }
  assert.deepEqual(coverKeys(spans), memberKeys(vol!.members));
});

test('hedge run stops at a gate / diagonal (they map to null, never coalesce)', () => {
  // A straight hedge broken by a gate tile in the middle: the flood from the
  // west end reaches only the west segment; the gate keeps the per-tile path.
  const cells = [
    ...rect(2, 3, 4, 3, Tile.Hedge),
    [5, 3, Tile.HedgeGateShut] as [number, number, Tile],
    ...rect(6, 3, 8, 3, Tile.Hedge),
  ];
  const vol = collectVolume(sampleOf(cells), 2, 3, hedgeClass, { perimeter: true });
  assert.ok(vol);
  assert.deepEqual(memberKeys(vol!.members), ['2,3', '3,3', '4,3'], 'the run stops at the gate');
  // The gate itself is not a hedge member → collectVolume seeded on it is null.
  assert.equal(collectVolume(sampleOf(cells), 5, 3, hedgeClass), null);
});
