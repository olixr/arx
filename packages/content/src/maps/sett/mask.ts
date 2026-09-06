/**
 * THE SETT (contested lands, band 9d) — mask.ts. THE SHAPE IS READ,
 * NOT DRAWN (brief §1.1; rulings R-B: the ground wins).
 *
 * The frame lane stamps worldgen's OWN level per cell: the ctx reads
 * generateChunk at WORLD_SEED (pure, cached per process, so the build
 * is byte-identical across builds and the mask is the ground's), and
 * for every cell of the frame's authorable interior:
 *
 *  - a level<0 cell is SUNK to its own level (`sink(x,y,1,1,depth)`
 *    per cell, the Dawnmead knoll's idiom inverted) with CaveFloor
 *    under it — the floor the Dolmen came up through;
 *  - a RIM cell (the builder's law: any cell with a lower 8-neighbour,
 *    which is worldgen's own Cliff at 303 of the 306 cells this seed
 *    deals) is painted Tile.Cliff VERBATIM, so the auto-fence finds
 *    every fence already grown (it skips a cell already fenced) and
 *    never has to bury a TILE_SKIP cell it may not touch;
 *  - nothing else is painted: outside the rim the field shows through.
 *
 * The frame's listed EDITS ride inside ctx.level (E1 THE LIP sinks
 * three; E2 and E3 THE TONGUES leave three each standing one level up
 * as cut faces, every cell a rim; each with its sentence in pins.ts),
 * so the mask, the rim and every scene argue with one read. The two flights are laid AFTER the mask by the
 * frame (index.ts): a tread overwrites its rim cell with Ramp and the
 * builder records it as the fence's one legal gap.
 */
import { Tile } from '@arx/shared';
import type { SettCtx, SettRegistry } from './ctx.js';

export function mask(ctx: SettCtx, registry: SettRegistry): void {
  const { b, frame } = ctx;
  const { ORIGIN, AUTHORABLE } = frame;
  for (let y = AUTHORABLE.y0; y <= AUTHORABLE.y1; y++) {
    for (let x = AUTHORABLE.x0; x <= AUTHORABLE.x1; x++) {
      const lvl = ctx.level(x, y);
      if (lvl < 0) {
        b.sink(x - ORIGIN.x, y - ORIGIN.y, 1, 1, -lvl);
        b.set(x - ORIGIN.x, y - ORIGIN.y, Tile.CaveFloor);
        registry.mask.sunk[lvl] = (registry.mask.sunk[lvl] ?? 0) + 1;
      }
    }
  }
  // THE RIM, verbatim: after every level is stamped, every cell with a
  // lower 8-neighbour is the high side of a fence and is painted
  // Cliff (the −1 cells beside the −2 core included: the core's rim
  // fences itself, and the yard reads it as its east wall).
  for (let y = AUTHORABLE.y0; y <= AUTHORABLE.y1; y++) {
    for (let x = AUTHORABLE.x0; x <= AUTHORABLE.x1; x++) {
      if (!ctx.rim(x, y)) continue;
      b.set(x - ORIGIN.x, y - ORIGIN.y, Tile.Cliff);
      registry.mask.rim++;
    }
  }
  for (const e of frame.EDITS) registry.mask.edits.push(e.why);
}
