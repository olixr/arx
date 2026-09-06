/**
 * THE ASHLAMP (contested lands, band 7) — THE COMPOSITION (L1 FRAME).
 *
 * The threshold scar on the First Road: a burnt Waykeeper waystation
 * at the lake's south tip where the road turns east, twelve seconds
 * from the gate (docs/contested-lands-plan.md §3.1; band7 rulings R1).
 * A SMALL AUTHORED ZONE on the Dawnmead module pattern COPIED: the
 * ctx, the pins, the lints, one scene module per scene, a sentence
 * above every placement. Not a POI: no garrison, no haven, no core,
 * no spawn, no bodies. The def `ashlamp`, the `poi_ashlamp` sketch
 * and the parked pin retire with it (L3, geography.ts).
 *
 * THE ORDER, which is the whole law of this file:
 *   makeCtx → ground (G1-G5) → the shell → the verge → the deferred
 *   details → the sign flush → growth 'wild' → build.
 *
 * LAWS THIS FRAME KEEPS:
 * - The base is TILE_SKIP: worldgen shows through every cell nobody
 *   authored; the border ring publishes no edge profile (skipRing).
 * - The road's bed inside the rect stays TILE_SKIP (bedUntouched) and
 *   every authored cell on the shoulder is listed with its reason
 *   (shoulderListed); the carve is read from geography, never typed.
 * - One Signpost per eyeful (the crofts' board is 68 tiles east).
 * - No warm light: the cold socket has no light row; the ember's
 *   coals breathe from dusk by the shipped flame gate.
 * - growth 'wild' (G-3): the ash ring and the tufts are the growth
 *   ledger's, slow and untended.
 * - Byte-identical across builds (ashRng is pure; no Rng draws).
 */
import { TILE_SKIP, type Tile } from '@arx/shared';
import { ZoneBuilder } from '../builder.js';
import type { ZoneDef } from '../types.js';
import { makeCtx, type AshRegistry } from './ctx.js';
import { ground } from './ground.js';
import { ORIGIN, PINS } from './pins.js';
import { shell } from './shell.js';
import { verge } from './verge.js';

/**
 * Build the Ashlamp and hand back the scenes' registry with it, for
 * the lints (ashlamp.test) and the block-out shots.
 */
export function buildAshlampWithRegistry(): { zone: ZoneDef; registry: AshRegistry } {
  // G0 THE BASE — 23x19 at world (48,92), transparent: the field's
  // own forest and the road carve show through until a scene authors
  // a cell.
  const b = new ZoneBuilder('ashlamp', 'The Ashlamp', { x: ORIGIN.x, y: ORIGIN.y }, PINS.WIDTH, PINS.HEIGHT, TILE_SKIP as unknown as Tile);
  const { ctx, registry } = makeCtx(b);

  // THE GROUND FIRST (G1-G5), then the two scenes.
  ground(ctx);
  shell(ctx);
  verge(ctx);

  // The deferred details land over the props (ash under the stake and
  // the heap; the floor's ash under the beams).
  for (const d of registry.details) b.setDetail(d.x - ORIGIN.x, d.y - ORIGIN.y, d.d);

  // THE SIGN FLUSH — every board after every fill; validateSigns still
  // gates the build.
  for (const s of registry.signs) b.sign(s.x - ORIGIN.x, s.y - ORIGIN.y, s.title, [...s.lines], s.tile);

  // G-3: authored wilderness, untended.
  b.growth('wild');
  return { zone: b.build(), registry };
}

/** The zone alone: the shape every registry and test consumes. */
export function buildAshlamp(): ZoneDef {
  return buildAshlampWithRegistry().zone;
}
