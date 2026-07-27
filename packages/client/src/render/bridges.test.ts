import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@devcraft/shared';
import { bridgeApronAt, deckWalkIsVertical } from './terrain.js';

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
