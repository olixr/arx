import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAW_ORDER, SHELF, type DrawOrderItem } from './drawOrder.js';

// ── helpers ──────────────────────────────────────────────────────────────
const vol = (nearRow: number, strat?: number): DrawOrderItem => ({ sortY: nearRow, nearRow, strat });
const body = (foot: number, strat?: number): DrawOrderItem => ({ sortY: foot, strat });

/** Sort a bag and return an index array so ties are observable. */
const order = (items: DrawOrderItem[]): DrawOrderItem[] => items.slice().sort(DRAW_ORDER);

// ── THE SHELF LAW is untouched (primary term) ─────────────────────────────

test('SHELF clamps positive shelves to one rank, sinks negatives', () => {
  assert.equal(SHELF(undefined), 0);
  assert.equal(SHELF(0), 0);
  assert.equal(SHELF(1), 1);
  assert.equal(SHELF(2), 1); // clamp
  assert.equal(SHELF(5), 1); // clamp
  assert.equal(SHELF(-1), -1); // pit sinks
});

test('shelf is the primary term: a higher shelf always draws later regardless of row', () => {
  const lowShelfSouth = body(100, 0); // far south (nearer), shelf 0
  const highShelfNorth = body(-100, 2); // far north, shelf 2 (clamps to 1)
  const [first, second] = order([highShelfNorth, lowShelfSouth]);
  assert.equal(first, lowShelfSouth); // shelf 0 first
  assert.equal(second, highShelfNorth); // shelf 1 later
});

// ── A5: near-edge depth key — billboard foot vs volume near row ────────────

test('a billboard whose foot is SOUTH of a wall near row draws IN FRONT (later)', () => {
  const wall = vol(10); // near/south edge at row 10
  const infront = body(11); // foot south of the wall
  const [first, second] = order([infront, wall]);
  assert.equal(first, wall);
  assert.equal(second, infront); // billboard painted last ⇒ in front
});

test('a billboard whose foot is NORTH of a wall near row draws BEHIND (earlier)', () => {
  const wall = vol(10);
  const behind = body(9); // foot north of the wall near edge
  const [first, second] = order([wall, behind]);
  assert.equal(first, behind); // billboard painted first ⇒ behind
  assert.equal(second, wall);
});

// ── A5: THE TIE RULE — body at the base of a wall wins ─────────────────────

test('TIE: a billboard foot EQUAL to the wall near row draws IN FRONT (a body at the base wins)', () => {
  const wall = vol(10);
  const atBase = body(10); // pressed against the wall base
  // order must be [wall, body] whichever way they arrive.
  assert.deepEqual(order([wall, atBase]), [wall, atBase]);
  assert.deepEqual(order([atBase, wall]), [wall, atBase]);
  // and the comparator is antisymmetric on the tie.
  assert.ok(DRAW_ORDER(wall, atBase) < 0);
  assert.ok(DRAW_ORDER(atBase, wall) > 0);
});

test('the tie rule respects the shelf: it only fires WITHIN a shelf', () => {
  const wall = vol(10, 0);
  const atBaseHigher = body(10, 1); // same row, higher shelf
  const [first, second] = order([atBaseHigher, wall]);
  assert.equal(first, wall); // shelf 0 volume first
  assert.equal(second, atBaseHigher); // higher shelf later regardless
});

// ── A5: near-edge vs foot — the volume uses its SOUTH edge, not its span ────

test('a body BESIDE a wall (its foot row < the wall south edge) still sorts behind', () => {
  // Wall run rows 5..8, south edge row 9. A body at row 7 (beside it) is
  // north of the near edge ⇒ behind. (One near-edge row per volume is the
  // D.2 model; D.3 per-column ceiling handles the poke-through case.)
  const wall = vol(9);
  const beside = body(7);
  assert.deepEqual(order([beside, wall]), [beside, wall]);
});

// ── The flat reduction: with occlusion OFF no item carries nearRow ─────────

test('with occlusion OFF (no nearRow) the comparator is the exact old sortY key', () => {
  // Reproduces the pre-A5 behaviour: sort purely by (shelf, sortY), stable.
  const a = body(3);
  const b = body(1);
  const c = body(2);
  const sorted = order([a, b, c]);
  assert.deepEqual(sorted.map((i) => i.sortY), [1, 2, 3]);
  // Equal rows preserve arrival order (stable, no tie-rank because neither
  // is a volume) — matches the old `a.sortY - b.sortY` returning 0.
  const p = body(5);
  const q = body(5);
  assert.equal(DRAW_ORDER(p, q), 0);
});

test('a volume with nearRow === sortY sorts identically to the old key against other volumes', () => {
  // nearRow === the volume south-edge sortY, so volume-vs-volume
  // ordering is unchanged from the raw-row era.
  const w1 = vol(4);
  const w2 = vol(6);
  const w3 = vol(5);
  assert.deepEqual(order([w1, w2, w3]).map((i) => i.nearRow), [4, 5, 6]);
});

// ── A5: the interleave a hedge-line needs ─────────────────────────────────

// ── G-PERF: THE STABLE TIEBREAK — a per-item sequence id ───────────────────

test('seq is the final tiebreak: exact (depth, rank) ties resolve by seq, not array position', () => {
  // Two billboards on the SAME row — a tall-grass band blit and a body.
  const grass: DrawOrderItem = { sortY: 42, seq: 3 };
  const bodyItem: DrawOrderItem = { sortY: 42, seq: 7 };
  // Whichever way they arrive, the lower seq draws first (behind).
  assert.deepEqual(order([grass, bodyItem]), [grass, bodyItem]);
  assert.deepEqual(order([bodyItem, grass]), [grass, bodyItem]);
  assert.ok(DRAW_ORDER(grass, bodyItem) < 0);
  assert.ok(DRAW_ORDER(bodyItem, grass) > 0);
});

test('seq only decides EXACT ties — depth and shelf still dominate', () => {
  const north: DrawOrderItem = { sortY: 10, seq: 100 };
  const south: DrawOrderItem = { sortY: 11, seq: 1 };
  // Depth wins over seq: the north (smaller row) draws first despite big seq.
  assert.deepEqual(order([south, north]), [north, south]);
  const lowShelf: DrawOrderItem = { sortY: 50, strat: 0, seq: 99 };
  const highShelf: DrawOrderItem = { sortY: 5, strat: 2, seq: 0 };
  // Shelf wins over both depth and seq.
  assert.deepEqual(order([highShelf, lowShelf]), [lowShelf, highShelf]);
});

test('seq absent (default 0) preserves the pre-tiebreak behaviour', () => {
  // Two bodies on the same row with no seq — the comparator returns 0 (the
  // old stable-sort tie), byte-identical to before the tiebreak existed.
  const p = body(5);
  const q = body(5);
  assert.equal(DRAW_ORDER(p, q), 0);
  // The volume/billboard rank still outranks seq: a volume with a HIGHER seq
  // than a same-row body still draws first (rank beats seq).
  const wall: DrawOrderItem = { sortY: 8, nearRow: 8, seq: 100 };
  const atBase: DrawOrderItem = { sortY: 8, seq: 0 };
  assert.deepEqual(order([atBase, wall]), [wall, atBase]);
});

test('a body walking a hedge line: in front when south of it, behind when north', () => {
  const hedge = vol(20); // hedge run south edge at row 20
  const south = body(21); // south of the hedge ⇒ in front
  const north = body(19); // north of the hedge ⇒ behind
  assert.deepEqual(order([hedge, south]), [hedge, south]); // hedge, then body
  assert.deepEqual(order([hedge, north]), [north, hedge]); // body, then hedge
});
