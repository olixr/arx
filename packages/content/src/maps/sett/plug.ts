/**
 * THE SETT (contested lands, band 9d) — plug.ts. S4 THE PLUG (the −2
 * core).
 *
 * SENTENCE (the scene's): they plugged the hole they came up through
 * with a corbelled dome, built over it, and have never stood on it
 * since.
 *
 * PRIMARY the dome, one CorbelCell on bare CaveFloor at the core's
 * heart. SECONDARY the walk: Dirt on the border of the ring at
 * Chebyshev 4 (ground.ts); nobody's post, waypoint or wander radius
 * enters the ring's inside (lint.plugUnwalked), which is "they have
 * never stood on it since" on the ground. TERTIARY nothing: bare
 * CaveFloor inside the walk. The inner ring of empty set-niches is
 * INSIDE the dome and is not built (no interior exists; nothing on
 * the floor pretends to be it: plan amendment 9).
 *
 * S3 THE CORE STEPS stand with it: the Marl cut the only way down to
 * the floor on the core's north rim because a stair faces the camera
 * and the ground allowed no other (the treads are the frame's, laid
 * after the mask; their aprons are ground.ts's).
 */
import { Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function plug(ctx: SettCtx): void {
  const { pins } = ctx;
  const { PLUG } = pins;
  ctx.box(PLUG.WALK.x0, PLUG.WALK.y0, PLUG.WALK.x1, PLUG.WALK.y1, 'plug: THE PLUG');

  // THE DOME. SENTENCE: the hole is under it and nobody says so.
  ctx.put(PLUG.DOME[0], PLUG.DOME[1], Tile.CorbelCell);
  ctx.occluder(PLUG.DOME[0], PLUG.DOME[1]);
}
