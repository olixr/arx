/**
 * THE SETT (contested lands, band 9d) — south.ts. S8 THE SOUTH RING
 * and THE GULLY (y 301..334): EMPTY ON PURPOSE (§13.1 law 7; brief
 * §1.3).
 *
 * SENTENCE (the scene's): nobody set anything here.
 *
 * PRIMARY nothing. SECONDARY the south foot: rubble the core's south
 * face shed, either side of it. TERTIARY three rubble by hand (the
 * `course` vocab's weights, no roll). Nothing else to y 334: the
 * gully stays sunk as worldgen has it (R-B) and holds nothing. C4
 * stood here (174..176,304) under the face and read from nowhere; it
 * moved to the laid course's end (rimset.ts), so the south ring is
 * emptier than the brief drew it, on purpose.
 */
import type { SettCtx } from './ctx.js';

export function south(ctx: SettCtx): void {
  const { pins } = ctx;
  const { SOUTH } = pins;
  ctx.box(154, 302, 194, 334, 'south: THE SOUTH RING AND THE GULLY');

  // THE SOUTH FOOT. SENTENCE: the core's south face sheds south, where
  // nobody set anything and nobody clears.
  for (const [x, y] of SOUTH.FOOT) ctx.rubble(x, y);

  // THE RUBBLE. SENTENCE: three heaps where the quarry's own spoil
  // lay when they came up, and nothing moved.
  for (const [x, y] of SOUTH.RUBBLE) ctx.rubble(x, y);
}
