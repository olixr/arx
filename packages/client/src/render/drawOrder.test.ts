import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DRAW_ORDER,
  Layer,
  stampDrawKeys,
  type DrawOrderItem,
  type DrawKeyItem,
} from './drawOrder.js';

// ── helpers ──────────────────────────────────────────────────────────────

/** Sort a bag and return the array (a copy) so ties are observable. */
const order = <T extends DrawOrderItem>(items: T[]): T[] => items.slice().sort(DRAW_ORDER);

/** Stamp a raw draw list exactly as the renderer does, then sort by row.
 *  Defaults model the flat camera: slope 1, origin 0, no elevation lift —
 *  so screenFootY == the world row and the algebraic collapse is exact. */
const stampAndOrder = (
  items: DrawKeyItem[],
  sYS = 1,
  oy = 0,
  elevPx = 1,
): DrawKeyItem[] => {
  stampDrawKeys(items, sYS, oy, elevPx);
  return items.slice().sort(DRAW_ORDER);
};

// ── THE PROPERTY: DRAW_ORDER is a VALID TOTAL ORDER ────────────────────────
// The whole point of the refactor. The old comparator had a per-pair
// exception that made it INTRANSITIVE, so V8's sort produced order that
// depended on input order → z-flicker. These fuzz the comparator over many
// random triples and assert antisymmetry + transitivity + totality. A
// regression to any pair-dependent key is caught here.

/** A cheap deterministic PRNG so the fuzz is reproducible. */
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
};

/** A bag of random items exactly as the renderer produces them: a UNIQUE
 *  `seq` per item (stampDrawKeys stamps the collect index), no stableId (the
 *  shipping config). Small key domains so exact (layer, screenFootY,
 *  classRank) ties are COMMON — the interesting case for a total order — and
 *  the unique seq then makes the order STRICT (no two distinct items equal). */
const randBag = (r: () => number, n: number): DrawOrderItem[] =>
  Array.from({ length: n }, (_, seq) => ({
    layer: [Layer.Ground, Layer.GroundDecal, Layer.World, Layer.Overhead][
      Math.floor(r() * 4)
    ]!,
    screenFootY: Math.floor(r() * 4), // 0..3 — many exact ties
    classRank: r() < 0.5 ? 0 : 1,
    seq, // unique, as stampDrawKeys guarantees
  }));

const sign = (n: number): number => (n < 0 ? -1 : n > 0 ? 1 : 0);
/** Negate a sign so 0 stays +0 (avoids the -0 !== 0 strict-equal artifact). */
const negSign = (n: number): number => (n === 0 ? 0 : -n);

test('PROPERTY: DRAW_ORDER is antisymmetric + reflexive over 20k random pairs', () => {
  const r = rng(0xa5a5);
  const bag = randBag(r, 400);
  for (let i = 0; i < 20000; i++) {
    const a = bag[Math.floor(r() * bag.length)]!;
    const b = bag[Math.floor(r() * bag.length)]!;
    assert.equal(
      sign(DRAW_ORDER(a, b)),
      negSign(sign(DRAW_ORDER(b, a))),
      `antisymmetry broke on ${JSON.stringify(a)} vs ${JSON.stringify(b)}`,
    );
    assert.equal(DRAW_ORDER(a, a), 0); // reflexive
  }
});

test('PROPERTY: DRAW_ORDER is transitive over 200k random triples', () => {
  const r = rng(0x1234);
  const bag = randBag(r, 400);
  for (let i = 0; i < 200000; i++) {
    const a = bag[Math.floor(r() * bag.length)]!;
    const b = bag[Math.floor(r() * bag.length)]!;
    const c = bag[Math.floor(r() * bag.length)]!;
    const ab = sign(DRAW_ORDER(a, b));
    const bc = sign(DRAW_ORDER(b, c));
    const ac = sign(DRAW_ORDER(a, c));
    if (ab <= 0 && bc <= 0) assert.ok(ac <= 0, `transitivity broke (<=): ${ab} ${bc} ${ac}`);
    if (ab >= 0 && bc >= 0) assert.ok(ac >= 0, `transitivity broke (>=): ${ab} ${bc} ${ac}`);
    if (ab === 0 && bc === 0) assert.equal(ac, 0, 'equality not transitive');
  }
});

test('PROPERTY: sorting is order-independent — every input permutation yields the same output', () => {
  // The intransitivity symptom was that shuffling the input changed the sort
  // output. With unique seqs the order is STRICT: sort many shuffles of the
  // same bag; the exact object sequence must match every time.
  const r = rng(0xbeef);
  const bag = randBag(r, 60);
  const keyOf = (it: DrawOrderItem): string => `${it.seq}`; // unique per item
  const canonical = order(bag).map(keyOf);
  for (let sh = 0; sh < 200; sh++) {
    const shuffled = bag.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    assert.deepEqual(order(shuffled).map(keyOf), canonical);
  }
});

// ── THE LAYER BANDS are the PRIMARY term ───────────────────────────────────

test('layer bands draw in order: ground < ground-decal < world < overhead < ui', () => {
  const ui: DrawOrderItem = { layer: Layer.Ui, screenFootY: -999 };
  const overhead: DrawOrderItem = { layer: Layer.Overhead, screenFootY: -999 };
  const world: DrawOrderItem = { layer: Layer.World, screenFootY: -999 };
  const decal: DrawOrderItem = { layer: Layer.GroundDecal, screenFootY: 999 };
  const ground: DrawOrderItem = { layer: Layer.Ground, screenFootY: 999 };
  // Even with a huge screenFootY, a lower band draws first.
  assert.deepEqual(order([ui, world, ground, overhead, decal]), [
    ground,
    decal,
    world,
    overhead,
    ui,
  ]);
});

test('layer defaults to World when unset', () => {
  const dflt: DrawOrderItem = { screenFootY: 5 };
  const decal: DrawOrderItem = { layer: Layer.GroundDecal, screenFootY: 5 };
  const overhead: DrawOrderItem = { layer: Layer.Overhead, screenFootY: 5 };
  assert.deepEqual(order([overhead, dflt, decal]), [decal, dflt, overhead]);
});

test('a raised grass decal draws under a world object even at the same row', () => {
  // The grass-swim guard: a ground-decal (raised coat) at the SAME screen row
  // as a body must stay under it — the band beats the row.
  const coat: DrawOrderItem = { layer: Layer.GroundDecal, screenFootY: 100 };
  const body: DrawOrderItem = { layer: Layer.World, screenFootY: 100 };
  assert.deepEqual(order([body, coat]), [coat, body]);
});

// ── WITHIN A BAND: screenFootY is the depth term ───────────────────────────

test('within a band, smaller screenFootY (up-screen) draws first (behind)', () => {
  const near: DrawOrderItem = { layer: Layer.World, screenFootY: 30 };
  const far: DrawOrderItem = { layer: Layer.World, screenFootY: 10 };
  const mid: DrawOrderItem = { layer: Layer.World, screenFootY: 20 };
  assert.deepEqual(order([near, far, mid]).map((i) => i.screenFootY), [10, 20, 30]);
});

// ── classRank: volume before billboard at an exact tie ─────────────────────

test('TIE: a volume draws before a billboard at the same screenFootY (body at a wall base wins)', () => {
  const wall: DrawOrderItem = { layer: Layer.World, screenFootY: 50, classRank: 0 };
  const atBase: DrawOrderItem = { layer: Layer.World, screenFootY: 50, classRank: 1 };
  assert.deepEqual(order([wall, atBase]), [wall, atBase]);
  assert.deepEqual(order([atBase, wall]), [wall, atBase]);
  assert.ok(DRAW_ORDER(wall, atBase) < 0);
  assert.ok(DRAW_ORDER(atBase, wall) > 0);
});

test('classRank only decides EXACT ties — screenFootY still dominates', () => {
  const volNorth: DrawOrderItem = { screenFootY: 9, classRank: 0 };
  const billSouth: DrawOrderItem = { screenFootY: 10, classRank: 1 };
  // The billboard is souther (nearer) ⇒ draws last despite being a billboard.
  assert.deepEqual(order([billSouth, volNorth]), [volNorth, billSouth]);
});

// ── stableId / seq: the final, deterministic tiebreak ──────────────────────

test('seq is the final tiebreak on an exact (layer, screenFootY, classRank) tie', () => {
  const a: DrawOrderItem = { screenFootY: 42, classRank: 1, seq: 3 };
  const b: DrawOrderItem = { screenFootY: 42, classRank: 1, seq: 7 };
  assert.deepEqual(order([b, a]), [a, b]);
  assert.ok(DRAW_ORDER(a, b) < 0);
});

test('stableId, when present, overrides seq for the final tiebreak', () => {
  // A camera-invariant id beats the per-frame collect index.
  const a: DrawOrderItem = { screenFootY: 1, classRank: 1, stableId: 2, seq: 99 };
  const b: DrawOrderItem = { screenFootY: 1, classRank: 1, stableId: 5, seq: 1 };
  assert.deepEqual(order([b, a]), [a, b]); // by stableId (2 < 5), not seq
});

// ── stampDrawKeys: THE CENTRAL DERIVATION ──────────────────────────────────

test('stampDrawKeys sets seq to the collect index and defaults layer to World', () => {
  const items: DrawKeyItem[] = [{ sortY: 3 }, { sortY: 1 }, { sortY: 2, layer: Layer.Ground }];
  stampDrawKeys(items, 1, 0, 1);
  assert.deepEqual(items.map((i) => i.seq), [0, 1, 2]);
  assert.deepEqual(items.map((i) => i.layer), [Layer.World, Layer.World, Layer.Ground]);
});

test('stampDrawKeys derives classRank from nearRow presence (volume vs billboard)', () => {
  const vol: DrawKeyItem = { sortY: 5, nearRow: 5 };
  const bill: DrawKeyItem = { sortY: 5 };
  stampDrawKeys([vol, bill], 1, 0, 1);
  assert.equal(vol.classRank, 0);
  assert.equal(bill.classRank, 1);
});

test('stampDrawKeys uses nearRow as the depth for volumes, sortY for billboards', () => {
  // A wall run spanning rows 5..8 sorts at its SOUTH edge (nearRow 9), not its
  // span; a billboard sorts at its foot (sortY).
  const wall: DrawKeyItem = { sortY: 5, nearRow: 9 };
  const bodyBeside: DrawKeyItem = { sortY: 7 }; // beside the wall, north of edge
  stampDrawKeys([wall, bodyBeside], 1, 0, 1);
  assert.equal(wall.screenFootY, 9);
  assert.equal(bodyBeside.screenFootY, 7);
  // The body (row 7) is north of the wall's near edge (9) ⇒ behind.
  assert.deepEqual([wall, bodyBeside].slice().sort(DRAW_ORDER), [bodyBeside, wall]);
});

test('screenFootY order: a body walking a hedge line — in front when south, behind when north', () => {
  const hedge: DrawKeyItem = { sortY: 20, nearRow: 20 }; // hedge south edge row 20
  const south: DrawKeyItem = { sortY: 21 }; // south of the hedge ⇒ in front
  const north: DrawKeyItem = { sortY: 19 }; // north of the hedge ⇒ behind
  assert.deepEqual(stampAndOrder([hedge, south]), [hedge, south]);
  assert.deepEqual(stampAndOrder([hedge, north]), [north, hedge]);
});

// ── THE ALGEBRAIC COLLAPSE: flat ground == the old raw-row (sortY) order ────

test('FLAT collapse: with strat 0 everywhere, WORLD order equals the old sortY order', () => {
  // The golden-gate invariant. screenFootY = sortY·(scale·yScale) + oy is a
  // strictly-monotone affine image of the world row, so sorting by it yields
  // exactly the raw-row order regardless of the (positive) slope and origin.
  const rows = [8.2, 1.0, 5.5, 5.5001, 3.3, 12.0, 0.0];
  const scale = 2.7;
  const yScale = 0.6;
  const sYS = scale * yScale;
  const oy = 137.5;
  const items: DrawKeyItem[] = rows.map((r, i) => ({ sortY: r, seq: i }));
  const got = stampAndOrder(items, sYS, oy, ELEV_PLACEHOLDER * scale).map((i) => i.sortY);
  const expected = [...rows].sort((a, b) => a - b);
  assert.deepEqual(got, expected);
});

test('FLAT collapse: an exact row tie between billboards falls to seq, deterministically', () => {
  const a: DrawKeyItem = { sortY: 5, seq: 0 };
  const b: DrawKeyItem = { sortY: 5, seq: 1 };
  stampDrawKeys([a, b], 3, 10, 3);
  assert.equal(a.screenFootY, b.screenFootY); // exact tie
  assert.deepEqual([b, a].slice().sort(DRAW_ORDER), [a, b]); // seq breaks it
});

// A stand-in for ELEV_H (renderer constant) — its exact value is irrelevant
// to the flat collapse (strat 0 zeroes the term); only its role as a lift.
const ELEV_PLACEHOLDER = 0.9;

// ── ELEVATION folded into screenFootY (no shelf clamp, no exception) ────────

test('ELEVATION: a raised item lifts up-screen (smaller screenFootY) so it draws behind a ground item at the same row', () => {
  // The old shelf-major rank forced raised OVER lower; now the true screen
  // contact row decides. A body on a level-2 crown at row R and a body on
  // ground at the same row R: the crown body's foot is lifted up-screen, so
  // it draws first (behind) — its contact point is genuinely farther.
  const sYS = 1;
  const oy = 0;
  const elevPx = 10;
  const raised: DrawKeyItem = { sortY: 40, strat: 2 }; // lifted 20 up
  const ground: DrawKeyItem = { sortY: 40, strat: 0 };
  stampDrawKeys([raised, ground], sYS, oy, elevPx);
  assert.equal(raised.screenFootY, 40 - 20);
  assert.equal(ground.screenFootY, 40);
  assert.deepEqual([ground, raised].slice().sort(DRAW_ORDER), [raised, ground]);
});

test('ELEVATION: a ground hedge in FRONT of a raised base occludes it — no front-base exception needed', () => {
  // The case the deleted exception patched. A raised building base (shelf 1)
  // and a ground hedge planted one row SOUTH (in front). The hedge's contact
  // point is lower on screen (not lifted) than the raised base's, so it draws
  // last (in front) straight from screenFootY — no special-case term.
  const sYS = 1;
  const oy = 0;
  const elevPx = 10;
  const raisedBase: DrawKeyItem = { sortY: 10, nearRow: 10, strat: 1 }; // lifted 10 up ⇒ 0
  const groundHedge: DrawKeyItem = { sortY: 11, nearRow: 11, strat: 0 }; // ⇒ 11
  stampDrawKeys([raisedBase, groundHedge], sYS, oy, elevPx);
  assert.ok(groundHedge.screenFootY! > raisedBase.screenFootY!);
  assert.deepEqual(
    [groundHedge, raisedBase].slice().sort(DRAW_ORDER),
    [raisedBase, groundHedge],
  );
});

// ── THE OVER-FOOT SKIRT stays bound to its object (still WORLD band) ────────
// The grass skirt shares its object's EXACT foot row + shelf and is collected
// AFTER the world objects, so its later seq draws it immediately after (over)
// its object — unchanged by the refactor (skirts stay in the WORLD band, not
// demoted to a decal, so they still nestle over the object's base edge).

test('SKIRT: shares the object row+shelf and draws right after it via the later seq', () => {
  const tree: DrawKeyItem = { sortY: 40, strat: 0, seq: 5 };
  const skirt: DrawKeyItem = { sortY: 40, strat: 0, seq: 12 };
  stampDrawKeys([tree, skirt], 1, 0, 1);
  assert.equal(tree.screenFootY, skirt.screenFootY); // same slot
  assert.deepEqual([skirt, tree].slice().sort(DRAW_ORDER), [tree, skirt]);
});

test('SKIRT: a genuinely souther object sorts after BOTH the object and its skirt (never wedges between)', () => {
  // Collection order (stampDrawKeys stamps seq by position): world objects
  // first (obj, then the souther object), skirts LAST — so the skirt's seq is
  // strictly greater than every world object's, binding it right after obj.
  const obj: DrawKeyItem = { sortY: 50, strat: 0 };
  const souther: DrawKeyItem = { sortY: 50.5, strat: 0 };
  const skirt: DrawKeyItem = { sortY: 50, strat: 0 };
  const sorted = stampAndOrder([obj, souther, skirt]);
  assert.deepEqual(sorted, [obj, skirt, souther]);
  assert.equal(sorted.indexOf(skirt), sorted.indexOf(obj) + 1); // contiguous
});
