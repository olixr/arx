import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { scanFallEar } from './falls.js';

/**
 * String-map worlds in the waterfalls.test.ts idiom: a ground map and
 * an elevation map, one char per tile, row-major, undefined outside.
 * Ground: G grass, C cliff, ~ water, w shallow. Elev: digits.
 */
function groundOf(rows: string[]) {
  const chars: Record<string, Tile> = {
    G: Tile.Grass,
    C: Tile.Cliff,
    '~': Tile.Water,
    w: Tile.WaterShallow,
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

const W = 24;
// The authored lip pattern, run the full width of the map: feed
// channel, grass lip, Cliff rim, dry apron, plunge basin.
const FALL_G = [
  '~'.repeat(W), // y0 feed
  'G'.repeat(W), // y1 lip
  'C'.repeat(W), // y2 rim
  'G'.repeat(W), // y3 apron (low side)
  'w'.repeat(W), // y4 plunge basin
];
const FALL_E = ['1'.repeat(W), '1'.repeat(W), '1'.repeat(W), '0'.repeat(W), '0'.repeat(W)];

test('FALL EARSHOT: a spilling rim is heard at its foot, centered', () => {
  const ear = scanFallEar(groundOf(FALL_G), elevOf(FALL_E), 12, 5.5);
  assert.ok(ear.near > 0.2, `the foot of a wide fall must be well in earshot (got ${ear.near})`);
  assert.ok(Math.abs(ear.pan) < 0.15, 'a fall spanning the view sits near center');
  assert.equal(ear.heft, 0.5, 'a one-level drop is half heft');
});

test('FALL EARSHOT: silence beyond earshot', () => {
  const ear = scanFallEar(groundOf(FALL_G), elevOf(FALL_E), 12, 45);
  assert.equal(ear.near, 0);
});

test('FALL EARSHOT: a dry cliff never hums', () => {
  const dryG = FALL_G.map((r) => r.replace(/[~w]/g, 'G'));
  const ear = scanFallEar(groundOf(dryG), elevOf(FALL_E), 12, 5.5);
  assert.equal(ear.near, 0, 'elevation boundaries without spill water are silent');
});

test('FALL EARSHOT: the voice sits toward the water', () => {
  // Water only on the east half — the west half of the rim is dry.
  const eastG = [
    'G'.repeat(12) + '~'.repeat(12),
    'G'.repeat(W),
    'C'.repeat(W),
    'G'.repeat(W),
    'G'.repeat(12) + 'w'.repeat(12),
  ];
  const ear = scanFallEar(groundOf(eastG), elevOf(FALL_E), 6, 5.5);
  assert.ok(ear.near > 0, 'the east chute is in earshot');
  assert.ok(ear.pan > 0.05, `falls east of the ear pan right (got ${ear.pan})`);
});

test('FALL EARSHOT: a sheer two-level drop carries full heft', () => {
  const tallE = ['2'.repeat(W), '2'.repeat(W), '2'.repeat(W), '0'.repeat(W), '0'.repeat(W)];
  const ear = scanFallEar(groundOf(FALL_G), elevOf(tallE), 12, 5.5);
  assert.ok(ear.near > 0.2);
  assert.equal(ear.heft, 1, 'a two-level sheer drop leans fully on the rumble');
});
