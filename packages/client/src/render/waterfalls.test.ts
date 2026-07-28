import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { spillAt } from './waterfalls.js';

/**
 * String-map worlds for THE SPILL LAW: per test a ground map and an
 * elevation map, one char per tile, row-major, undefined outside.
 * Ground: G grass, C cliff, R ramp, ~ water, w shallow, D deep,
 * S sand, F fishing spot. Elev: digits (0-3).
 */
function groundOf(rows: string[]) {
  const chars: Record<string, Tile> = {
    G: Tile.Grass,
    C: Tile.Cliff,
    R: Tile.Ramp,
    '~': Tile.Water,
    w: Tile.WaterShallow,
    D: Tile.WaterDeep,
    S: Tile.Sand,
    F: Tile.FishingSpot,
  };
  return (tx: number, ty: number): number | undefined => {
    if (ty < 0 || ty >= rows.length || tx < 0) return undefined;
    const c = rows[ty]![tx];
    return c === undefined ? undefined : chars[c];
  };
}

function elevOf(rows: string[]) {
  return (tx: number, ty: number): number | undefined => {
    if (ty < 0 || ty >= rows.length || tx < 0) return undefined;
    const c = rows[ty]![tx];
    return c === undefined ? undefined : Number(c);
  };
}

// The Silverfall pattern: channel -> grass lip -> Cliff rim -> face at
// the row boundary -> dry apron row -> plunge basin. South-facing
// boundary at world y=3 (between the rim row y2 and the apron row y3).
const SILVER_G = [
  '~~~~', // y0 feed channel
  'GGGG', // y1 the lip
  'CCCC', // y2 the rim strip
  'GGGG', // y3 dry apron on the low side
  'wwww', // y4 plunge basin
];
const SILVER_E = [
  '1111',
  '1111',
  '1111',
  '0000',
  '0000',
];

test('THE SPILL LAW: the authored lip pattern spills (race past the rim, drop past the apron)', () => {
  const info = spillAt(groundOf(SILVER_G), elevOf(SILVER_E), 2, 3, 0, 1, 1);
  assert.ok(info, 'channel + basin around the rim must spill');
  assert.equal(info.race, 2, 'feed water sits 2 tiles behind the boundary (rim, lip, water)');
  assert.equal(info.drop, 1, 'plunge water sits 1 tile past the foot');
  assert.equal(info.landElev, 0);
});

test('no plunge water below means no fall — a dry cliff by a high pond stays dry', () => {
  const g = groundOf(['~~~~', 'GGGG', 'CCCC', 'GGGG', 'GGGG']);
  assert.equal(spillAt(g, elevOf(SILVER_E), 2, 3, 0, 1, 1), null);
});

test('no feed water above means no fall — a pool at the cliff foot alone stays still', () => {
  const g = groundOf(['GGGG', 'GGGG', 'CCCC', 'GGGG', 'wwww']);
  assert.equal(spillAt(g, elevOf(SILVER_E), 2, 3, 0, 1, 1), null);
});

test('feed water beyond FALL_LOOKBACK does not reach the lip', () => {
  const g = groundOf(['~~~~', 'GGGG', 'GGGG', 'GGGG', 'CCCC', 'GGGG', 'wwww']);
  const e = elevOf(['1111', '1111', '1111', '1111', '1111', '0000', '0000']);
  assert.equal(spillAt(g, e, 2, 5, 0, 1, 1), null, 'water 4 back is out of reach');
});

test('a wall rising behind the rim blocks the feed — that water belongs to a higher fall', () => {
  const g = groundOf(['~~~~', 'CCCC', 'CCCC', 'GGGG', 'wwww']);
  const e = elevOf(['2222', '2222', '1111', '0000', '0000']);
  assert.equal(spillAt(g, e, 2, 3, 0, 1, 1), null, 'the level-1 boundary must not claim level-2 water');
});

test('a stacked two-level drop lands where the water truly is', () => {
  // elev 2 terrace dropping sheer past a 1-wide elev-1 bench to water at 0.
  const g = groundOf(['~~~~', 'CCCC', 'CCCC', 'wwww']);
  const e = elevOf(['2222', '2222', '1111', '0000']);
  const info = spillAt(g, e, 2, 2, 0, 1, 2);
  assert.ok(info, 'the top face owns the stacked curtain');
  assert.equal(info.landElev, 0, 'the curtain hangs to the true landing elevation');
  assert.equal(info.drop, 1);
  // The intermediate level-1 boundary must NOT hang its own curtain:
  // its high walk starts on elev-2 ground, not elev-1.
  assert.equal(spillAt(g, e, 2, 2, 0, 1, 1), null);
});

test('north-facing spill: feed south of the boundary, plunge to the north', () => {
  const g = groundOf(['wwww', 'GGGG', 'CCCC', 'GGGG', '~~~~']);
  const e = elevOf(['0000', '0000', '1111', '1111', '1111']);
  const info = spillAt(g, e, 2, 2, 0, -1, 1);
  assert.ok(info, 'the mirrored pattern spills north');
  assert.equal(info.race, 2);
  assert.equal(info.drop, 1);
});

test('side spill (east-facing rim): the walk turns horizontal', () => {
  const g = groundOf([
    '~GCGw', //   feed | lip | rim || apron | basin
    '~GCGw',
  ]);
  const e = elevOf(['11100', '11100']);
  const info = spillAt(g, e, 3, 0.5, 1, 0, 1);
  assert.ok(info, 'an east-facing rim spills east');
  assert.equal(info.race, 2);
  assert.equal(info.drop, 1);
  assert.equal(spillAt(g, e, 3, 0.5, -1, 0, 1), null, 'the west reading of the same line is dry');
});

test('diagonal spill falls back to the cardinal walks', () => {
  // A beveled corner: high mass NW, water channel due north of the
  // boundary cell, basin due south — the exact diagonal ray misses
  // the water but the cardinal component finds it.
  const g = groundOf([
    '~~GG',
    'GGGG',
    'CCGG',
    'GwGG',
  ]);
  const e = elevOf(['1111', '1111', '1100', '0000']);
  const q = Math.SQRT1_2;
  const info = spillAt(g, e, 1.75, 2.75, q, q, 1);
  assert.ok(info, 'the bevel spills via its cardinal components');
});

test('shallow, deep and fishing-spot water all feed and catch a fall', () => {
  const g = groundOf(['DDDD', 'GGGG', 'CCCC', 'GGGG', 'FFFF']);
  const info = spillAt(g, elevOf(SILVER_E), 2, 3, 0, 1, 1);
  assert.ok(info);
  assert.equal(info.race, 2);
});
