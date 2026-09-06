/**
 * THE SETT (contested lands, band 9d) — south.ts. S8 THE SOUTH RING
 * and THE GULLY (y 301..334): EMPTY ON PURPOSE (§13.1 law 7; brief
 * §1.3).
 *
 * SENTENCE (the scene's): nobody set anything here; the Marl chalked
 * the next run and did not set it.
 *
 * PRIMARY nothing. SECONDARY Chalkline C4: the Course's next run,
 * chalked southward and not set; the wood's teeth are that way.
 * TERTIARY three rubble by hand (the `course` vocab's weights, no
 * roll). Nothing else to y 334: the gully stays sunk as worldgen has
 * it (E3, R-B) and holds nothing.
 */
import { Detail } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function south(ctx: SettCtx): void {
  const { pins } = ctx;
  const { SOUTH } = pins;
  ctx.box(154, 302, 194, 334, 'south: THE SOUTH RING AND THE GULLY');

  // C4. SENTENCE: the next run is chalked toward the wood and nobody
  // has set it, because the count of stones has not come back.
  for (const [x, y] of SOUTH.C4) ctx.detail(x, y, Detail.Chalkline);

  // THE RUBBLE. SENTENCE: three heaps where the quarry's own spoil
  // lay when they came up, and nothing moved.
  for (const [x, y] of SOUTH.RUBBLE) ctx.rubble(x, y);
}
