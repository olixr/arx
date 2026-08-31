import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RaisedKind,
  buildRegisterRows,
  classifyRaised,
  mixSig,
  planStretches,
  type RegisterHost,
} from './staticRegister.js';

/**
 * String-map worlds for the register laws — one char per tile,
 * row-major, undefined outside. The host's tile vocabulary is the
 * test's own (the classifier is route logic; the renderer wires the
 * real shared sets, which the type checker pins):
 *   . grass   W wall   d doorway   w WIDE doorway   X diag wall
 *   G curtain g garrison gate      R ramp           C cliff
 *   A arch    P portal  L pillar   F rail           B bridge(dock)
 *   b bridge(plain)     ~ water    ! water w/ bridge deck-fill
 *   T tree    c crop
 */
const T: Record<string, number> = {
  '.': 1,
  W: 100,
  d: 101,
  w: 102,
  X: 103,
  G: 110,
  g: 111,
  R: 120,
  C: 130,
  A: 140,
  P: 141,
  L: 142,
  F: 143,
  B: 144,
  b: 145,
  '~': 146,
  '!': 147,
  T: 150,
  c: 151,
};

function hostOf(rows: string[], elev?: string[]): RegisterHost {
  const at = (tx: number, ty: number): number | undefined => {
    if (ty < 0 || ty >= rows.length || tx < 0) return undefined;
    const ch = rows[ty]![tx];
    return ch === undefined ? undefined : T[ch];
  };
  const elevAt = (tx: number, ty: number): number => {
    if (!elev) return 0;
    const ch = elev[ty]?.[tx];
    return ch === undefined || ch === '.' ? 0 : Number(ch);
  };
  const isWallish = (t: number | undefined) =>
    t !== undefined && (t === T.W || t === T.X || t === T.d || t === T.w);
  const isCurtain = (t: number | undefined) => t === T.G;
  return {
    groundAt: at,
    elevAt,
    isTree: (t) => t === T.T,
    isGarrison: (t) => t === T.G || t === T.g,
    hasDoorInfo: (t) => t === T.g,
    isDoor: (t) => t === T.d || t === T.w,
    doorIsWide: (t) => t === T.w,
    isDiagWall: (t) => t === T.X,
    isWall: (t) => t === T.W || t === T.d || t === T.w,
    isCliff: (t) => t === T.C,
    isRamp: (t) => t === T.R,
    isArch: (t) => t === T.A,
    isPortal: (t) => t === T.P,
    isPillar: (t) => t === T.L,
    isRail: (t) => t === T.F,
    isBridge: (t) => t === T.B || t === T.b,
    isWater: (t) => t === T['~'] || t === T['!'],
    isRaisedLike: (t) => t === T.T || t === T.c,
    // Same neighbor rule as the renderer's rampDir: first lower
    // neighbor in S, E, N, W order; [0,1] fallback.
    rampDirY: (tx, ty) => {
      const lvl = elevAt(tx, ty);
      for (const [dx, dy] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ] as const) {
        if (elevAt(tx + dx, ty + dy) < lvl) return dy;
      }
      return 1;
    },
    // Same shape as the renderer's laws: run-mates above AND below,
    // not beside.
    isSideDoorway: (tx, ty) => {
      const t = at(tx, ty);
      if (t !== T.d && t !== T.w) return false;
      const along = (n: number | undefined) => (isWallish(n) && n !== T.d && n !== T.w) || n === t;
      const vert = along(at(tx, ty - 1)) && along(at(tx, ty + 1));
      const horiz = along(at(tx + 1, ty)) && along(at(tx - 1, ty));
      return vert && !horiz;
    },
    isGarrisonSideGate: (tx, ty) => {
      const t = at(tx, ty);
      if (t !== T.g) return false;
      const along = (n: number | undefined) => isCurtain(n) || n === t;
      const vert = along(at(tx, ty - 1)) && along(at(tx, ty + 1));
      const horiz = along(at(tx + 1, ty)) && along(at(tx - 1, ty));
      return vert && !horiz;
    },
    isDockAt: (tx, ty) => at(tx, ty) === T.B,
    deckFillIsBridge: (tx, ty) => at(tx, ty) === T['!'],
  };
}

test('every route classifies to its kind; empty ground and cliffs to nothing', () => {
  const h = hostOf(['.WXCAPLF', 'Tc~bB!..']);
  const kind = (tx: number, ty: number) => classifyRaised(h, tx, ty)?.kind;
  assert.equal(classifyRaised(h, 0, 0), null); // grass
  assert.equal(kind(1, 0), RaisedKind.Wall);
  assert.equal(kind(2, 0), RaisedKind.DiagWall);
  assert.equal(classifyRaised(h, 3, 0), null); // cliff — faces elsewhere
  assert.equal(kind(4, 0), RaisedKind.Arch);
  assert.equal(kind(5, 0), RaisedKind.Portal);
  assert.equal(kind(6, 0), RaisedKind.Pillar);
  assert.equal(kind(7, 0), RaisedKind.Rail);
  assert.equal(kind(0, 1), RaisedKind.Generic); // tree
  assert.equal(kind(1, 1), RaisedKind.Generic); // crop
  assert.equal(classifyRaised(h, 2, 1), null); // plain water
  assert.equal(classifyRaised(h, 3, 1), null); // bridge, no dock
  assert.equal(kind(4, 1), RaisedKind.BridgeRails);
  assert.equal(kind(5, 1), RaisedKind.DeckFillRail);
  assert.equal(classifyRaised(h, 9, 0), null); // off the map
});

test('pad admission rides the silhouette classes: trees, garrison, portals', () => {
  const h = hostOf(['TGPWc']);
  assert.equal(classifyRaised(h, 0, 0)!.treeLike, true); // tree
  assert.equal(classifyRaised(h, 1, 0)!.treeLike, true); // curtain
  assert.equal(classifyRaised(h, 2, 0)!.treeLike, true); // portal
  assert.equal(classifyRaised(h, 3, 0)!.treeLike, false); // wall
  assert.equal(classifyRaised(h, 4, 0)!.treeLike, false); // crop
});

test('a wide E-W doorway run merges to its west anchor from every tile', () => {
  const h = hostOf(['WwwwW']);
  for (let tx = 1; tx <= 3; tx++) {
    const m = classifyRaised(h, tx, 0)!;
    assert.equal(m.kind, RaisedKind.Doorway);
    assert.equal(m.tx, 1);
    assert.equal(m.len, 3);
    assert.equal(m.endX, 3);
  }
  // Plain doorways never merge: two singles stay two framed doors.
  const h2 = hostOf(['WddW']);
  const a = classifyRaised(h2, 1, 0)!;
  const b = classifyRaised(h2, 2, 0)!;
  assert.equal(a.len, 1);
  assert.equal(b.len, 1);
  assert.notEqual(a.tx, b.tx);
});

test('a doorway in a N-S wall run goes edge-on; wide ones merge to the north anchor', () => {
  const h = hostOf(['.W.', '.w.', '.w.', '.W.']);
  for (const ty of [1, 2]) {
    const m = classifyRaised(h, 1, ty)!;
    assert.equal(m.kind, RaisedKind.SideDoorway);
    assert.equal(m.ty, 1); // north anchor
    assert.equal(m.len, 2);
  }
});

test('N/S ramp flights merge across their E-W run; E/W flights stay single', () => {
  // A 3-wide stair descending south off a level-1 shelf.
  const g = ['RRR'];
  const e = ['111'];
  const h = hostOf(g, e);
  for (let tx = 0; tx <= 2; tx++) {
    const m = classifyRaised(h, tx, 0)!;
    assert.equal(m.kind, RaisedKind.RampRun);
    assert.equal(m.tx, 0);
    assert.equal(m.len, 3);
  }
  // A flight whose only lower neighbor is EAST descends east — E/W
  // flights stay per-tile. (South stays level or the S-first neighbor
  // order would claim it.)
  const h2 = hostOf(['R.', '..'], ['10', '11']);
  const m2 = classifyRaised(h2, 0, 0)!;
  assert.equal(m2.kind, RaisedKind.RampSingle);
  assert.equal(m2.len, 1);
});

test('garrison gates merge E-W; side gates merge N-S; curtains stand alone', () => {
  const h = hostOf(['GggG']);
  for (const tx of [1, 2]) {
    const m = classifyRaised(h, tx, 0)!;
    assert.equal(m.kind, RaisedKind.GarrisonGate);
    assert.equal(m.tx, 1);
    assert.equal(m.len, 2);
  }
  assert.equal(classifyRaised(h, 0, 0)!.kind, RaisedKind.GarrisonWall);
  const v = hostOf(['.G', '.g', '.g', '.G']);
  for (const ty of [1, 2]) {
    const m = classifyRaised(v, 1, ty)!;
    assert.equal(m.kind, RaisedKind.GarrisonSideGate);
    assert.equal(m.ty, 1);
    assert.equal(m.len, 2);
  }
});

test('register rows list members west-to-east, dedupe run tiles, and span vertical runs', () => {
  // Chunk (0,0) at size 8: a wall row with a wide door, a tree, and a
  // vertical side doorway column.
  const rows = [
    '........',
    '.WwwW.T.',
    '...w....', // lone wide door BELOW the run — not part of it
    '...W....',
    '........',
    '........',
    '........',
    '........',
  ];
  // Make row 2's door a side doorway: wall above (the 'w' at 1,2? no)
  // — keep it simple: row 2's w has wall north at (3,1)? (3,1) is 'w'
  // (same tile) and (3,3) is W — so it IS a side doorway run of len 2
  // with the (3,1) wide door… (3,1)'s own north is (3,0) '.', so
  // (3,1) is NOT side (it merges E-W with row 1's run).
  const h = hostOf(rows);
  const reg = buildRegisterRows(h, 0, 0, 8);
  const r1 = reg[1]!;
  // Row 1: wall at 1, the wide E-W door run (anchor 2, len 2), wall at
  // 4, tree at 6 — in that order, run listed once.
  assert.deepEqual(
    r1.map((m) => [m.kind, m.tx, m.len]),
    [
      [RaisedKind.Wall, 1, 1],
      [RaisedKind.Doorway, 2, 2],
      [RaisedKind.Wall, 4, 1],
      [RaisedKind.Generic, 6, 1],
    ],
  );
  // Row 2: the (3,2) wide door sits between same-run door north and
  // wall south → SIDE doorway anchored at its first run row.
  const r2 = reg[2]!;
  assert.equal(r2.length, 1);
  assert.equal(r2[0]!.kind, RaisedKind.SideDoorway);
  // Row 3: the wall under it.
  assert.equal(reg[3]![0]!.kind, RaisedKind.Wall);
});

test('a vertical run lands a copy on every spanned in-chunk row', () => {
  const rows = ['.G......', '.g......', '.g......', '.g......', '.G......', '........', '........', '........'];
  const h = hostOf(rows);
  const reg = buildRegisterRows(h, 0, 0, 8);
  for (const ty of [1, 2, 3]) {
    const list = reg[ty]!;
    const gate = list.find((m) => m.kind === RaisedKind.GarrisonSideGate)!;
    assert.ok(gate, `row ${ty} lists the side gate`);
    assert.equal(gate.ty, 1); // same north anchor from every row
    assert.equal(gate.len, 3);
  }
});

test('a run anchored west of the chunk keeps its true anchor', () => {
  // Chunk (1,0) at size 4 — tiles x4-7. The wide-door run starts at
  // x2 in the neighbor chunk and reaches into ours.
  const rows = ['WwwwwwW.'];
  const h = hostOf(rows);
  const reg = buildRegisterRows(h, 1, 0, 4);
  const list = reg[0]!;
  const door = list.find((m) => m.kind === RaisedKind.Doorway)!;
  assert.equal(door.tx, 1); // true west anchor, outside this chunk
  assert.equal(door.len, 5);
  assert.equal(door.endX, 5);
});

test('the classifier and the register agree tile for tile', () => {
  // Parity: every tile's classification appears in the register rows
  // (dedupe aside) — the register IS the scan, compiled.
  const rows = [
    'T.W.R.C.',
    '.GggG...',
    '~~!~~B..',
    '.c.L.F..',
    'WwwW....',
    '........',
    'P.A.....',
    '..X.....',
  ];
  const elev = ['....11..', '........', '........', '........', '........', '........', '........', '........'];
  const h = hostOf(rows, elev);
  const reg = buildRegisterRows(h, 0, 0, 8);
  const seen = new Set<string>();
  for (const list of reg) {
    for (const m of list ?? []) seen.add(`${m.kind}:${m.tx},${m.ty}`);
  }
  for (let ty = 0; ty < 8; ty++) {
    for (let tx = 0; tx < 8; tx++) {
      const m = classifyRaised(h, tx, ty);
      if (m === null) continue;
      assert.ok(
        seen.has(`${m.kind}:${m.tx},${m.ty}`),
        `(${tx},${ty}) kind ${m.kind} anchored (${m.tx},${m.ty}) is registered`,
      );
    }
  }
});

// ── Phase 2: band stretch planning ──────────────────────────────

test('stretches split at non-bandable members, never at empty gaps', () => {
  const member = (kind: RaisedKind, tx: number, len = 1) =>
    ({ kind, tile: 1, tx, ty: 0, len, endX: tx + len - 1, treeLike: false });
  const rows = [
    [
      member(RaisedKind.Wall, 1),
      member(RaisedKind.Wall, 2),
      member(RaisedKind.Doorway, 3), // live — splits the run
      member(RaisedKind.Wall, 4),
      member(RaisedKind.Wall, 9), // gap 5-8 empty — same stretch
    ],
  ];
  const ss = planStretches(rows, (m) => m.kind !== RaisedKind.Doorway)[0]!;
  assert.deepEqual(
    ss.map((s) => [s.i0, s.i1]),
    [
      [0, 1],
      [3, 4],
    ],
  );
});

test('ramp runs stay singleton stretches beside other bandables', () => {
  const member = (kind: RaisedKind, tx: number, len = 1) =>
    ({ kind, tile: 1, tx, ty: 0, len, endX: tx + len - 1, treeLike: false });
  const rows = [
    [member(RaisedKind.Wall, 0), member(RaisedKind.RampRun, 1, 3), member(RaisedKind.Wall, 5)],
  ];
  const ss = planStretches(rows, () => true)[0]!;
  assert.deepEqual(
    ss.map((s) => [s.i0, s.i1]),
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  );
});

test('A SHELF, NOT A WALL: a maximal run is cut every BAND_MAX_SPAN tiles', () => {
  const member = (tx: number) =>
    ({ kind: RaisedKind.Wall, tile: 1, tx, ty: 0, len: 1, endX: tx, treeLike: false });
  // A cave row: 30 tiles of unbroken rock. Left maximal it is one
  // 11MB canvas at close zoom — the band the Undercroft crash was
  // made of. Cut, it is a handful of shelves the budget can hold.
  const rows = [Array.from({ length: 30 }, (_, i) => member(i))];
  const ss = planStretches(rows, () => true, 12)[0]!;
  assert.deepEqual(
    ss.map((s) => [s.i0, s.i1]),
    [
      [0, 11],
      [12, 23],
      [24, 29],
    ],
  );
  // Every segment is a distinct, stable identity.
  assert.equal(new Set(ss.map((s) => s.key)).size, ss.length);
});

test('the span cut falls BETWEEN members, never inside a merged run', () => {
  const member = (kind: RaisedKind, tx: number, len = 1) =>
    ({ kind, tile: 1, tx, ty: 0, len, endX: tx + len - 1, treeLike: false });
  // A member wider than the whole span may not be sliced — it opens
  // its own segment and stands alone. (Its own canvas is then the
  // per-band ceiling's business, not the planner's.)
  const rows = [[member(RaisedKind.Wall, 0), member(RaisedKind.Wall, 1, 20), member(RaisedKind.Wall, 21)]];
  const ss = planStretches(rows, () => true, 6)[0]!;
  assert.deepEqual(
    ss.map((s) => [s.i0, s.i1]),
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  );
});

test('THE SHELF CUTS TO THE CROWN: garrison members hold their segment to the tall span', () => {
  const member = (kind: RaisedKind, tx: number) =>
    ({ kind, tile: 1, tx, ty: 0, len: 1, endX: tx, treeLike: false });
  // Twelve garrison tiles: at the ordinary span this is ONE stretch
  // whose ~4.6-tile crown head-room busts the per-band ceiling on a
  // retina panel — the "TooBig straggler" that painted its masonry
  // live forever. At the tall span it is two shelves that both fit.
  const garr = [Array.from({ length: 12 }, (_, i) => member(RaisedKind.GarrisonWall, i))];
  const gs = planStretches(garr, () => true)[0]!;
  assert.deepEqual(
    gs.map((s) => [s.i0, s.i1]),
    [
      [0, 5],
      [6, 11],
    ],
  );
  // A garrison member JOINING a wall segment pulls the whole segment
  // down to the tall span — the canvas is as tall as its tallest.
  const mixed = [
    [
      member(RaisedKind.Wall, 0),
      member(RaisedKind.Wall, 1),
      member(RaisedKind.GarrisonWall, 2),
      member(RaisedKind.Wall, 3),
      member(RaisedKind.Wall, 6),
      member(RaisedKind.Wall, 7),
    ],
  ];
  const ms = planStretches(mixed, () => true)[0]!;
  assert.deepEqual(
    ms.map((s) => [s.i0, s.i1]),
    [
      [0, 3],
      [4, 5],
    ],
  );
});

test('a gap-merged run is measured to its EAST end, not its member count', () => {
  const member = (tx: number) =>
    ({ kind: RaisedKind.Wall, tile: 1, tx, ty: 0, len: 1, endX: tx, treeLike: false });
  // Two members 20 tiles apart: cheap by count, ruinous by canvas
  // width. The span is what the canvas costs, so they split.
  const ss = planStretches([[member(0), member(20)]], () => true, 12)[0]!;
  assert.deepEqual(
    ss.map((s) => [s.i0, s.i1]),
    [
      [0, 0],
      [1, 1],
    ],
  );
});

test('stretch keys are stable across rebuilds and distinct across rows', () => {
  const member = (tx: number, ty: number) =>
    ({ kind: RaisedKind.Wall, tile: 1, tx, ty, len: 1, endX: tx, treeLike: false });
  const mk = () => [[member(7, 0), member(8, 0)], undefined, [member(7, 2)]];
  const a = planStretches(mk(), () => true);
  const b = planStretches(mk(), () => true);
  assert.equal(a[0]![0]!.key, b[0]![0]!.key);
  assert.notEqual(a[0]![0]!.key, a[2]![0]!.key);
});

test('mixSig is order- and value-sensitive', () => {
  let h1 = 0x811c9dc5 | 0;
  let h2 = 0x811c9dc5 | 0;
  for (const v of [3, 7, 11]) h1 = mixSig(h1, v);
  for (const v of [7, 3, 11]) h2 = mixSig(h2, v);
  assert.notEqual(h1, h2);
  let h3 = 0x811c9dc5 | 0;
  for (const v of [3, 7, 12]) h3 = mixSig(h3, v);
  assert.notEqual(h1, h3);
});
