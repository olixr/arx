import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { buildSilverfall } from './silverfall.js';

/**
 * THE FOOT-WATER LAW: a waterfall lands IN water. Wherever a channel
 * spills over a south-facing rim (feed water on the high terrace
 * within the spill law's lookback), the tile at the foot of the face
 * must be water — a curtain pounding bank grass reads wrong no matter
 * how the renderer dresses it, so the map is held to it here. Mirrors
 * scanHigh in client render/waterfalls.ts: the walk stays at exactly
 * the rim's level, and a wall behind the rim ends it (that water
 * belongs to a higher fall).
 */
const WATER = new Set<number>([
  Tile.Water,
  Tile.WaterDeep,
  Tile.WaterShallow,
  Tile.FishingSpot,
]);
const LOOKBACK = 4;

test('every south-facing spill in Silverfall lands in water at the wall', () => {
  const z = buildSilverfall();
  const elev = z.elev;
  assert.ok(elev, 'silverfall carries an elevation layer');
  const g = (x: number, y: number): number => z.ground[y * z.width + x]!;
  const e = (x: number, y: number): number => elev[y * z.width + x]!;
  let spills = 0;
  for (let y = 0; y < z.height - 1; y++) {
    for (let x = 0; x < z.width; x++) {
      const level = e(x, y);
      if (e(x, y + 1) >= level) continue; // not a south-facing drop
      // Feed scan northward across the rim strip at exactly `level`.
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
  // The three terrace falls are at least 4 columns wide each; if this
  // ever reads zero the feed scan is broken, not the map clean.
  assert.ok(spills >= 12, `expected the three falls' columns, saw ${spills}`);
});
