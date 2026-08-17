import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { deckArmVertical, deckFillAt } from './terrain.js';

/**
 * THE DOCK JUNCTION LAWS (user screenshot, the river dock at the
 * bridge's east flank): a chunky platform must read as ONE floor, and
 * a notch fill must dress in the lumber of the field its boards
 * continue. Fixture worlds follow bridges.test.ts's grammar.
 */
function samplerOf(rows: string[]) {
  const chars: Record<string, Tile> = {
    G: Tile.Grass,
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

test('A TIE IS A BAY: a stepped platform keeps one board rhythm throughout', () => {
  // The live junction's shape: a wide platform off a bridge flank
  // with a block stepped one tile east below it. The old square-tie
  // rule flipped the lower block's interior columns to the brick bond
  // and cut header beams across one continuous floor — the mid-deck
  // seam the user photographed.
  const g = samplerOf([
    'GGGGGGGG',
    'BDDDDDGG', // platform rows: x1-5
    'BDDDDDGG',
    'B~~DDDDG', // stepped block: x3-6
    'B~~DDDDG',
    'B~~~~~~G',
  ]);
  for (let y = 1; y <= 4; y++) {
    for (let x = 1; x <= 6; x++) {
      if (g(x, y) !== Tile.Dock) continue;
      assert.equal(
        deckArmVertical(g, x, y),
        false,
        `platform tile ${x},${y} must lay long planks — a tie is a bay, not an arm`,
      );
    }
  }
});

test('a strict N-S arm still earns the brick bond', () => {
  const g = samplerOf([
    '~~D~',
    '~~D~',
    '~~D~',
    '~~D~',
  ]);
  assert.equal(deckArmVertical(g, 2, 1), true);
});

test('THE FILL WEARS THE FIELD IT CONTINUES: family follows the N/S leg', () => {
  // Boards inside a fill run with the N/S leg's arm — so the lumber
  // family must come from that same leg, or a dock platform's corner
  // wears bridge grey with a kerb stringer (the junction's mismatched
  // twin wedges). The east/west leg's family is irrelevant.
  const notch = samplerOf([
    'BDD',
    'B~~',
    'B~~',
  ]);
  const f = deckFillAt(notch, 1, 1);
  assert.ok(f !== null, 'the inner corner welds');
  assert.equal(f!.legs, 'NW');
  assert.equal(f!.family, 'dock', 'boards continue the dock row above — dock lumber, no kerb');

  // A true bridge chamfer keeps its bridge dress: the N/S leg IS the span.
  const chamfer = samplerOf([
    'BBB',
    '~BB',
    '~~~',
  ]);
  const fb = deckFillAt(chamfer, 0, 1);
  assert.ok(fb !== null, 'the span chamfers');
  assert.equal(fb!.legs, 'NE');
  assert.equal(fb!.family, 'bridge');
});
