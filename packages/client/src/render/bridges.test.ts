import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { bridgeApronAt, deckArmVertical, deckCoverRects, deckFillAt, deckWalkIsVertical, DOCK_LIFT, fillContains, fillCoversEdge } from './terrain.js';

/**
 * String-map worlds for the bridge laws: one char per tile, row-major,
 * undefined outside — G grass, P path, ~ water, B bridge, D dock.
 */
function samplerOf(rows: string[]) {
  const chars: Record<string, Tile> = {
    G: Tile.Grass,
    P: Tile.Path,
    '~': Tile.Water,
    B: Tile.Bridge,
    D: Tile.Dock,
    F: Tile.FishingSpot,
  };
  return (tx: number, ty: number): number | undefined => {
    if (ty < 0 || ty >= rows.length || tx < 0) return undefined;
    const c = rows[ty]![tx];
    return c === undefined ? undefined : chars[c];
  };
}

test('a clean rectangular span ramps at both walk ends, every row agreeing', () => {
  const g = samplerOf([
    'GGG~GGG',
    'GBBBBBG', // span x1-5, rows y1-2, crossing the x=3 stream
    'GBBBBBG',
    'GGG~GGG',
  ]);
  const vert = deckWalkIsVertical(g, 3, 1);
  assert.equal(vert, false, 'water past the sides means the walk runs E-W');
  assert.equal(bridgeApronAt(g, 1, 1, vert), 'W');
  assert.equal(bridgeApronAt(g, 1, 2, vert), 'W');
  assert.equal(bridgeApronAt(g, 5, 1, vert), 'E');
  assert.equal(bridgeApronAt(g, 5, 2, vert), 'E');
  assert.equal(bridgeApronAt(g, 3, 1, vert), 'none', 'mid-span never ramps');
});

test('THE RUN LAW: a ragged span flattens the mixed run instead of tearing', () => {
  // Row y2 reaches one tile further west than row y1: at column x2 the
  // upper row wants to ramp W while the lower row continues — one
  // sloping beside one flat would tear the deck. The whole run stays
  // flat; only the lone outer step (x1,y2), with no deck beside it,
  // may still ramp.
  const g = samplerOf([
    'GGGG~GGG',
    'GGBBBBBG', // y1: x2-6
    'GBBBBBBG', // y2: x1-6
    'GGGG~GGG',
  ]);
  const vert = deckWalkIsVertical(g, 4, 1);
  assert.equal(vert, false);
  assert.equal(bridgeApronAt(g, 2, 1, vert), 'none', 'mixed run must not ramp');
  assert.equal(bridgeApronAt(g, 1, 2, vert), 'W', 'the lone outer step has no run partner');
  assert.equal(bridgeApronAt(g, 6, 1, vert), 'E', 'the aligned east end still ramps');
  assert.equal(bridgeApronAt(g, 6, 2, vert), 'E');
});

test('a dock in the run flattens it — docks never slope', () => {
  const g = samplerOf([
    'GG~GG',
    'GBBBG',
    'GDDDG',
    'GG~GG',
  ]);
  const vert = deckWalkIsVertical(g, 2, 1);
  assert.equal(vert, false);
  assert.equal(bridgeApronAt(g, 1, 1, vert), 'none');
});

test('THE ARM LAW: board rhythm follows the arm, and turns exactly at the L', () => {
  const g = samplerOf([
    '~~~~~~~~',
    '~DDDDDD~', // y1-2: the E-W arm, x1-6
    '~DDDDDD~',
    '~~~~DD~~', // y3-5: the N-S arm hanging off it, x4-5
    '~~~~DD~~',
    '~~~~DD~~',
    '~~~~~~~~',
  ]);
  assert.equal(deckArmVertical(g, 2, 1), false, 'the long arm lays long planks E-W');
  assert.equal(deckArmVertical(g, 4, 5), true, 'the hanging arm breaks its bond N-S');
  // The rhythm turns across ONE shared edge — the exact edge the
  // painters dress with a header beam, so every turn is carpentry.
  assert.equal(deckArmVertical(g, 4, 2), false, 'the junction row still rides the long arm');
  assert.equal(deckArmVertical(g, 4, 3), true, 'the first arm tile below it turns');
});

test('THE ARM LAW: a clean rectangular span keeps one rhythm end to end', () => {
  const rows = ['~~~~~~'];
  for (let i = 0; i < 6; i++) rows.push('~BBBB~');
  rows.push('~~~~~~');
  const g = samplerOf(rows);
  for (let y = 1; y <= 6; y++) {
    for (let x = 1; x <= 4; x++) {
      assert.equal(deckArmVertical(g, x, y), true, `uniform at ${x},${y}`);
    }
  }
});

test('THE NOTCH-FILL LAW: a stair-step grows 45° fills on both shoulders', () => {
  // A diagonal worldgen crossing: the upper row reaches east, the
  // lower row west. The two inner corners — water hugged by deck on
  // exactly two adjacent sides — fill; open water does not.
  const g = samplerOf([
    '~~~~~~',
    '~~~BBB', // y1: x3-5
    '~BBB~~', // y2: x1-3
    '~~~~~~',
  ]);
  assert.deepEqual(
    deckFillAt(g, 2, 1),
    { legs: 'SE', family: 'bridge', bank: false },
    'upper-left notch',
  );
  assert.deepEqual(
    deckFillAt(g, 4, 2),
    { legs: 'NW', family: 'bridge', bank: false },
    'lower-right notch',
  );
  assert.equal(deckFillAt(g, 0, 0), null, 'open water never fills');
  assert.equal(deckFillAt(g, 1, 1), null, 'one deck side is an edge, not a notch');
  // The fill's leg edges read as covered (interior); the hyp-side
  // edges stay open water.
  assert.equal(fillCoversEdge(g, 2, 1, 'S'), true);
  assert.equal(fillCoversEdge(g, 2, 1, 'E'), true);
  assert.equal(fillCoversEdge(g, 2, 1, 'N'), false);
  assert.equal(fillCoversEdge(g, 2, 1, 'W'), false);
});

test('the fill gate stays narrow: inlets, gaps and fishing spots never board over', () => {
  const inlet = samplerOf([
    'BBB',
    'B~B', // three deck sides: an authored boat slip
    '~~~',
  ]);
  assert.equal(deckFillAt(inlet, 1, 1), null, 'a three-sided inlet is authored, not a notch');
  const gap = samplerOf([
    '~B~',
    '~~~',
    '~B~',
  ]);
  assert.equal(deckFillAt(gap, 1, 1), null, 'opposite decks are a deliberate gap');
  const spot = samplerOf([
    'BB',
    'FB',
  ]);
  assert.equal(deckFillAt(spot, 0, 1), null, 'a fishing spot must stay open water');
});

test('fill family: docks fill as docks, a mixed junction goes to the bridge', () => {
  const dock = samplerOf([
    'DD',
    '~D',
  ]);
  assert.deepEqual(deckFillAt(dock, 0, 1), { legs: 'NE', family: 'dock', bank: false });
  const mixed = samplerOf([
    'BD',
    '~D',
  ]);
  assert.deepEqual(deckFillAt(mixed, 0, 1), { legs: 'NE', family: 'bridge', bank: false });
});

test('a north-south walk ramps N/S, judged along the horizontal run', () => {
  const g = samplerOf([
    'GGPGG',
    'GGBGG',
    '~~B~~',
    'GGBGG',
    'GGPGG',
  ]);
  const vert = deckWalkIsVertical(g, 2, 2);
  assert.equal(vert, true, 'water past the sides means the walk runs N-S');
  assert.equal(bridgeApronAt(g, 2, 1, vert), 'N');
  assert.equal(bridgeApronAt(g, 2, 3, vert), 'S');
  assert.equal(bridgeApronAt(g, 2, 2, vert), 'none');
});

test('THE BANK CHAMFER: a staircase corner on walkable land fills like water does', () => {
  // A diagonal crossing meeting the bank: the inner corner at (2,2)
  // is grass hugged by lifted flat deck on N and E — it chamfers,
  // exactly as a water notch would.
  const g = samplerOf([
    '~~~~~~',
    '~~BBBB', // y1: x2-5
    '~~GBBB', // y2: deck x3-5; grass notch at x2
    '~~GGB~', // y3
    '~~~~~~',
  ]);
  assert.deepEqual(
    deckFillAt(g, 2, 2),
    { legs: 'NE', family: 'bridge', bank: true },
    'the bank corner chamfers',
  );
  // The bank fill covers its leg edges like any water fill.
  assert.equal(fillCoversEdge(g, 2, 2, 'N'), true);
  assert.equal(fillCoversEdge(g, 2, 2, 'E'), true);
});

test('bank fills refuse ramping apron legs and unlifted decks', () => {
  // (1,1) is a W apron (lone outer step, land west, deck east): the
  // grass notch under it at (1,2) must stay square — a sloped leg
  // would tear against the fill triangle.
  const ramp = samplerOf([
    'GGG~GGG',
    'GBBBBBG', // x1-5; W/E aprons at the row ends
    'GGBBBGG', // x2-4
    'GGG~GGG',
  ]);
  assert.equal(deckFillAt(ramp, 1, 2), null, 'an apron leg keeps the corner square');
  // Deck tiles far from any water are not lifted — no bank fill may
  // lean on them.
  const dry = samplerOf([
    'GGGG',
    'GBBB',
    'GGBB',
    'GGBB',
  ]);
  assert.equal(deckFillAt(dry, 1, 2), null, 'no water within reach: nothing is lifted');
});

test('THE FILL IS REAL GROUND: the triangle is deck underfoot, the open notch stays water', () => {
  // A NE fill: deck north and east, hypotenuse from the NW corner to
  // the SE corner — inside (toward the solid NE corner) is boards,
  // outside is still open water. Water on the west keeps the step
  // tiles off the apron ladder (a ramping leg refuses its fill).
  const g = samplerOf([
    '~BBB',
    '~~BB', // (1,1) is the notch: deck N and E
    '~~~B',
  ]);
  const f = deckFillAt(g, 1, 1);
  assert.ok(f !== null && f.legs === 'NE');
  assert.equal(fillContains('NE', 1, 1, 1.8, 1.2), true, 'near the solid corner: boards');
  assert.equal(fillContains('NE', 1, 1, 1.2, 1.8), false, 'past the hypotenuse: water');
  // The four orientations agree on their own solid corners.
  assert.equal(fillContains('NW', 0, 0, 0.2, 0.2), true);
  assert.equal(fillContains('NW', 0, 0, 0.9, 0.9), false);
  assert.equal(fillContains('SE', 0, 0, 0.9, 0.9), true);
  assert.equal(fillContains('SE', 0, 0, 0.1, 0.1), false);
  assert.equal(fillContains('SW', 0, 0, 0.2, 0.9), true);
  assert.equal(fillContains('SW', 0, 0, 0.9, 0.2), false);
});

test('THE MIRROR STOPS AT THE STRUCTURE: cover rects are disjoint and own every deck cell', () => {
  const g = samplerOf([
    'GGGGG',
    '~~~~~',
    '~BBB~', // span at y2, water all around — boards poke north into y1
    '~~~~~',
  ]);
  const bounds = { minTx: 0, maxTx: 4, minTy: 0, maxTy: 3 };
  const rects = deckCoverRects(g, bounds);
  // Every deck tile owns one rect that spans its cell and reaches
  // DOCK_LIFT/0.6 north for the lifted boards.
  const L = DOCK_LIFT / 0.6;
  for (const x of [1, 2, 3]) {
    const r = rects.find((c) => c.x === x && Math.abs(c.y - (2 - L)) < 1e-9);
    assert.ok(r, `deck cell x=${x} carries its cover rect`);
    assert.ok(Math.abs(r.h - (1 + L)) < 1e-9, 'cover runs boards-top to fascia-foot');
  }
  // Disjointness: no two rects overlap (the even-odd punch-out law —
  // any overlap would flip back to a reflection leak).
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      const overlap =
        a.x < b.x + b.w - 1e-9 &&
        b.x < a.x + a.w - 1e-9 &&
        a.y < b.y + b.h - 1e-9 &&
        b.y < a.y + a.h - 1e-9;
      assert.equal(overlap, false, 'cover rects must never overlap');
    }
  }
});

test('cover rects stay disjoint where fills, decks and stacked runs meet', () => {
  // A stair-step with a NE fill at (1,2), deck rows stacked vertically
  // — the classic overlap traps: deck-above-deck bands and the fill
  // cell under a deck row.
  const g = samplerOf([
    '~BBB',
    '~BBB', // two stacked deck rows: the lower's band must yield
    '~~BB', // (1,2) NE fill under the run
    '~~~B',
  ]);
  const rects = deckCoverRects(g, { minTx: 0, maxTx: 3, minTy: 0, maxTy: 3 });
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      const overlap =
        a.x < b.x + b.w - 1e-9 &&
        b.x < a.x + a.w - 1e-9 &&
        a.y < b.y + b.h - 1e-9 &&
        b.y < a.y + a.h - 1e-9;
      assert.equal(overlap, false, 'no pair may overlap');
    }
  }
  // The fill's own cell is fully covered.
  assert.ok(
    rects.some((r) => r.x === 1 && r.y === 2 && r.w === 1 && r.h === 1),
    'the fill cell is deck-owned for the mirror',
  );
});
