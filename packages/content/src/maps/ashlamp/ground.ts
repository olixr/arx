/**
 * THE ASHLAMP (contested lands, band 7) — ground.ts. THE GROUND FIRST.
 *
 * G0 the base is TILE_SKIP everywhere: worldgen's forest, its grass
 *    and the road carve show through every cell this file and the
 *    scenes do not author (site-grammar §1.5, §2.1). The border ring
 *    is never touched (lint.skipRing) and the bed never (lint.bedUntouched).
 * G1 the shell's floor: Dirt (55..59, 94..96) under Detail.Ash (J14) —
 *    the room burned to its floor; the ember's one cell bare, so the
 *    pan reads against the ash and not under it (fix pass 1).
 * G2 the ash ring: Detail.Ash on Dirt two tiles out from the walls on
 *    the flanks (x 52..53 and 61..62, rows 93..97), ragged on the zone
 *    hash, never on the bed. Where the hash leaves a cell, the field's
 *    own grass shows through the ash: the ground remembers unevenly.
 * G3 wear: a Dirt ellipse at the west breach; a worn line from the bed
 *    at (52,99) up to the ash heap; a worn line from the bed at (61,101)
 *    to the sign (the bed cells refuse the brush and the line begins
 *    where the shoulder does); a trodden patch under the wain on the
 *    north shoulder.
 * G4 THE FIRST AUTHORED BURN STROKE lives in geography.ts (spectrum
 *    'ashlamp_burn', centre the shell's heart): the skin folds toward
 *    ash under everything here without a new tile (E2).
 * G5 GrassTall tufts hashed at the ring's rim (J14's ash vocabulary):
 *    what grows back first grows back long.
 */
import { Detail, Tile } from '@arx/shared';
import type { AshCtx } from './ctx.js';

export function ground(ctx: AshCtx): void {
  const { pins } = ctx;

  // G1 THE FLOOR. SENTENCE: the room burned to its floor, and the ash
  // is the floor now. The ember's own cell is left bare (fix pass 1):
  // the pan reads against the ash around it, never under it.
  const [ex, ey]: [number, number] = [pins.EMBER[0], pins.EMBER[1]];
  for (let y: number = pins.FLOOR.y0; y <= pins.FLOOR.y1; y++) {
    for (let x: number = pins.FLOOR.x0; x <= pins.FLOOR.x1; x++) {
      ctx.put(x, y, Tile.Dirt);
      if (x === ex && y === ey) continue;
      ctx.detail(x, y, Detail.Ash);
    }
  }
  // The three breaches are trodden ground, not wall: the ways in and out.
  for (const [x, y] of pins.BREACHES) ctx.put(x, y, Tile.Dirt);

  // G2 THE ASH RING. SENTENCE: what the wind carried out of the shell
  // lies two tiles deep on either flank, thinner where the grass won.
  for (const x of pins.ASH_RING_COLS) {
    for (let y = pins.ASH_RING_ROWS.y0; y <= pins.ASH_RING_ROWS.y1; y++) {
      if (ctx.onBed(x, y)) continue;
      if (ctx.rng(x, y) > 0.68) continue;
      ctx.put(x, y, Tile.Dirt);
      ctx.detail(x, y, Detail.Ash);
    }
  }

  // G3 THE WEAR. SENTENCE: somebody shovelled out the west breach and
  // walked the ash to the road; somebody reads the board from the bed.
  const w = pins.WEST_BREACH_WEAR;
  ctx.wear.ellipse(w.cx, w.cy, w.rx, w.ry);
  ctx.wear.line(pins.WEST_LINE);
  ctx.wear.line(pins.SIGN_LINE);
  // The trodden patch under the wain: wheels and boots on the north
  // shoulder where the cart pulled off under the oaks and did not
  // pull back on. An ellipse, ragged on the hash like every wear
  // brush (THE CURATION LAW: wear is wobbling lines and ellipses,
  // never rectangles; fix pass 2 struck the one ruled yard here).
  const p = pins.WAIN_PATCH;
  ctx.wear.ellipse(p.cx, p.cy, p.rx, p.ry);

  // G5 THE TUFTS. SENTENCE: what grows back first grows back long.
  for (const [x, y] of pins.TUFT_RIM) {
    if (ctx.onShoulder(x, y)) continue;
    if (ctx.rng(x + 7, y + 3) < 0.45) ctx.put(x, y, Tile.GrassTall);
  }
}
