import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAW_ORDER, SHELF, type DrawOrderItem } from './drawOrder.js';

// ── helpers ──────────────────────────────────────────────────────────────
const vol = (nearRow: number, strat?: number): DrawOrderItem => ({ sortY: nearRow, nearRow, strat });
const body = (foot: number, strat?: number): DrawOrderItem => ({ sortY: foot, strat });
/** A mature tree: a ground-rooted VOLUME whose near edge is its foot row
 *  (renderer objectItem sets nearRow === sortY === ty+0.9). */
const tree = (foot: number, strat?: number): DrawOrderItem => ({ sortY: foot, nearRow: foot, strat });

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

// ── CAUSE 1: a BAKED wall keeps its volume rank (nearRow carried) ──────────

test('CAUSE 1: a baked wall carrying nearRow ties as a VOLUME vs a front hedge, and the hedge (south) draws in front', () => {
  // A COLD/BAKED wall now carries nearRow (== its sortY) just like a live
  // wall, so DRAW_ORDER treats it as a volume, not a billboard. A hedge
  // abutting its south face on the SAME row must draw in front of it.
  const bakedWall = vol(10); // baked wall, near/south edge at row 10, strat 0
  const frontHedge = vol(11); // hedge one row south (its own south edge row 11)
  assert.deepEqual(order([bakedWall, frontHedge]), [bakedWall, frontHedge]);
  assert.deepEqual(order([frontHedge, bakedWall]), [bakedWall, frontHedge]);
});

test('CAUSE 1 regression it guards: a baked wall MISSING nearRow (billboard) loses the same-row tie to a front hedge', () => {
  // This is the pre-fix bug shape: the baked wall was emitted WITHOUT nearRow,
  // so on an exact same-row tie DRAW_ORDER's rank rule drew the volume (hedge)
  // FIRST and the billboard (baked wall) AFTER ⇒ wall over hedge. Documented
  // here so a future regression that drops the baked nearRow is caught.
  const bakedWallNoNear: DrawOrderItem = { sortY: 10 }; // billboard-class (bug)
  const hedge = vol(10); // volume on the exact same row
  // The volume (hedge) draws FIRST, the billboard (wall) LAST ⇒ wall over hedge.
  assert.deepEqual(order([bakedWallNoNear, hedge]), [hedge, bakedWallNoNear]);
});

// ── CAUSE 2: a raised building base does NOT dominate a ground hedge in front ─

test('CAUSE 2: a ground hedge in front (south) of a raised building base occludes the base, not dominated by SHELF', () => {
  // Terraced town: the building base wall is a VOLUME on shelf 1, the hedge a
  // VOLUME on shelf 0 planted one row SOUTH (in front). Before the fix SHELF
  // put the raised base over the hedge at every row; now the front-base
  // exception resolves by near row ⇒ the hedge draws last (in front).
  const raisedBase = vol(10, 1); // building base wall, shelf 1, south edge row 10
  const groundHedge = vol(11, 0); // hedge one row south, ground shelf 0
  assert.deepEqual(order([raisedBase, groundHedge]), [raisedBase, groundHedge]);
  assert.deepEqual(order([groundHedge, raisedBase]), [raisedBase, groundHedge]);
});

test('CAUSE 2 stays NARROW: a raised volume NOT in front of the ground volume keeps SHELF and draws over it', () => {
  // Genuine elevation layering must be untouched. The exception fires ONLY when
  // the LOWER shelf is STRICTLY south of (in front of) the higher one; anything
  // else keeps SHELF so raised content draws over lower foreground.
  const groundHedge = vol(10, 0);
  // (1) Raised volume SOUTH of / in front of the hedge (larger near row): the
  //     raised thing is genuinely in front and up ⇒ SHELF wins, raised on top.
  const raisedInFront = vol(11, 1);
  assert.deepEqual(order([raisedInFront, groundHedge]), [groundHedge, raisedInFront]);
  // (2) Exact same near row keeps SHELF (conservative: raised stays on top).
  const raisedSameRow = vol(10, 1);
  assert.deepEqual(order([raisedSameRow, groundHedge]), [groundHedge, raisedSameRow]);
});

test('CAUSE 2 exception never fires for billboards: a raised BODY over a ground hedge keeps SHELF (wall/entity sort unchanged)', () => {
  // Only volume-vs-volume enters the exception. A raised entity (billboard, no
  // nearRow) over a ground hedge keeps pure SHELF — elevation over foreground.
  const raisedBody = body(11, 1); // a body on the terrace, south of the hedge
  const groundHedge = vol(10, 0);
  assert.deepEqual(order([raisedBody, groundHedge]), [groundHedge, raisedBody]);
});

// ── TREE vs HEDGE: a tree is a VOLUME, so it sorts by TRUE ground depth ─────

test('FLAT tree-vs-hedge: a tree NORTH of a hedge draws BEHIND it, a tree SOUTH draws IN FRONT', () => {
  // Same shelf (flat q=0). The tree's near edge is its foot row (ty+0.9); the
  // hedge run's is its south edge (ty+1). North of the hedge ⇒ smaller row ⇒
  // painted first ⇒ behind; south ⇒ larger row ⇒ painted last ⇒ in front.
  const hedge = vol(20); // hedge tile row 19, south edge row 20
  const north = tree(18.9); // tree tile row 18 ⇒ foot 18.9 (north of the hedge)
  const south = tree(20.9); // tree tile row 20 ⇒ foot 20.9 (south of the hedge)
  assert.deepEqual(order([hedge, north]), [north, hedge]); // tree then hedge ⇒ behind
  assert.deepEqual(order([hedge, south]), [hedge, south]); // hedge then tree ⇒ in front
});

test('CROSS-SHELF (the bug): a ground tree in FRONT (south) of a RAISED hedge draws OVER it', () => {
  // The reported defect: a hedge on a higher terrace (shelf 1) and a tree at
  // ground (shelf 0) planted SOUTH of it. Before trees carried a near row the
  // tree was a billboard, so SHELF dominated and the raised hedge drew over the
  // tree even though the tree is physically in front. As a VOLUME the tree now
  // flows through the front-base exception and its true (souther) ground row
  // wins ⇒ the tree draws last, over the hedge.
  const raisedHedge = vol(35, 1); // hedge on the terrace, south edge row 35
  const groundTree = tree(36.9, 0); // tree at ground, foot two rows south / in front
  assert.deepEqual(order([raisedHedge, groundTree]), [raisedHedge, groundTree]);
  assert.deepEqual(order([groundTree, raisedHedge]), [raisedHedge, groundTree]);
});

test('CROSS-SHELF: a RAISED tree over a ground hedge that is SOUTH of it (in front) is occluded by the hedge', () => {
  // The mirror case: a tree up on the terrace (shelf 1) and a hedge at ground
  // (shelf 0) planted in FRONT (south). The ground hedge is genuinely nearer,
  // so it draws last (over the raised tree's base) — no tree-over-hedge.
  const raisedTree = tree(9.9, 1); // tree on the terrace (north/up)
  const groundHedge = vol(11, 0); // hedge at ground, south / in front
  assert.deepEqual(order([raisedTree, groundHedge]), [raisedTree, groundHedge]);
  assert.deepEqual(order([groundHedge, raisedTree]), [raisedTree, groundHedge]);
});

test('CROSS-SHELF stays narrow: a raised tree genuinely IN FRONT of a ground hedge keeps SHELF and draws over it', () => {
  // The front-base exception fires ONLY when the LOWER shelf is strictly south
  // of the higher one. A raised tree whose foot is SOUTH of (in front of) a
  // ground hedge is genuinely in front AND up ⇒ SHELF wins, raised tree on top.
  const groundHedge = vol(10, 0); // hedge at ground, south edge row 10
  const raisedTreeInFront = tree(11, 1); // tree up on the terrace, south of it
  assert.deepEqual(order([raisedTreeInFront, groundHedge]), [groundHedge, raisedTreeInFront]);
  // Exact same near row keeps SHELF too (conservative: raised stays on top).
  const raisedTreeSameRow = tree(10, 1);
  assert.deepEqual(order([raisedTreeSameRow, groundHedge]), [groundHedge, raisedTreeSameRow]);
});

test('REGRESSION GUARD: the tree fix does NOT touch player-vs-hedge — a raised BODY over a ground hedge still keeps SHELF', () => {
  // A player/NPC/beast is a billboard (no nearRow); only trees became volumes.
  // A raised body in front of a ground hedge still keeps SHELF exactly as
  // before, so wall/hedge-vs-entity sort is unchanged.
  const raisedBody = body(21, 1); // a player on the terrace, south of the hedge
  const groundHedge = vol(20, 0);
  assert.deepEqual(order([raisedBody, groundHedge]), [groundHedge, raisedBody]);
  // …and a raised body over a ground hedge stays on top regardless of row.
  const raisedBodyNorth = body(18, 1);
  assert.deepEqual(order([groundHedge, raisedBodyNorth]), [groundHedge, raisedBodyNorth]);
});
