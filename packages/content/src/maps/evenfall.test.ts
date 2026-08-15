import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { buildEvenfall } from './evenfall.js';

/**
 * THE FOOT-WATER LAW, kept in Evenfall: a waterfall lands IN water.
 * The Moonstair is the city's one image — the twin races fall lip by
 * lip beside the ascent — so every south-facing spill with feed water
 * on its terrace must pound water at the foot of its face, exactly as
 * silverfall.test.ts holds the capital to it. Mirrors scanHigh in
 * client render/waterfalls.ts: the feed walk stays at the rim's own
 * level and stops at the first wall.
 */
const WATER = new Set<number>([
  Tile.Water,
  Tile.WaterDeep,
  Tile.WaterShallow,
  Tile.FishingSpot,
]);
const LOOKBACK = 4;

test('every south-facing spill on the Moonstair lands in water at the wall', () => {
  const z = buildEvenfall();
  const elev = z.elev;
  assert.ok(elev, 'evenfall carries an elevation layer');
  const g = (x: number, y: number): number => z.ground[y * z.width + x]!;
  const e = (x: number, y: number): number => elev[y * z.width + x]!;
  let spills = 0;
  for (let y = 0; y < z.height - 1; y++) {
    for (let x = 0; x < z.width; x++) {
      const level = e(x, y);
      if (e(x, y + 1) >= level) continue; // not a south-facing drop
      let feed = false;
      for (let k = 1; k < LOOKBACK; k++) {
        const yy = y - k;
        if (yy < 0 || e(x, yy) !== level) break;
        if (WATER.has(g(x, yy))) {
          feed = true;
          break;
        }
      }
      if (!feed) continue;
      spills++;
      assert.ok(
        WATER.has(g(x, y + 1)),
        `fall column (${x},${y}) spills onto tile ${g(x, y + 1)} at its foot — ` +
          'extend the plunge water to the wall',
      );
    }
  }
  // Two races, three lips each, two columns wide: twelve fall columns
  // minimum. Zero means the feed scan broke, not that the map is dry.
  assert.ok(spills >= 12, `expected the twin races' columns, saw ${spills}`);
});
