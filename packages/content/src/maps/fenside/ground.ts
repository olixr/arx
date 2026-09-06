/**
 * THE FEN WAIST (contested lands, band 7) — ground.ts. THE GROUND FIRST.
 *
 * G0 the base is TILE_SKIP everywhere: the fen's forest, the channel,
 *    its swamp rim and the road carve with its bridge deck show
 *    through every cell nobody authors. The border ring is never
 *    touched (lint.skipRing); the bed never but the two BAR_GAP cells
 *    (lint.bedUntouched).
 * G1 a Dirt ellipse under the cage and the drover's seat, and one
 *    under the counter beside them on the north shoulder.
 * G2 the shoulders at the post line worn to Dirt three tiles either
 *    side, on the hash, never on the bed: the road is narrowed here
 *    and the narrowing is walked around; and the treeline south of
 *    the bar felled to the rect's south edge at y 99 (the occlusion
 *    law: worldgen's oaks at y 92..97 painted over the south post,
 *    the teeth and the gap at the true frame), where the crew's own
 *    clearing takes over one row further south.
 * G3 nothing on the bed but the BAR_GAP cells (bar.ts places them).
 * G4 nothing on the water but the mark-post, the dike line and the
 *    last rag: the crossing's north lip is the contested cell.
 * G5 the head's apron: a Dirt yard on the west bank north of the road
 *    where the Charter's counter stands, and the approach worn from
 *    the north shoulder to the counter's mouth.
 */
import { Tile } from '@arx/shared';
import type { FenCtx } from './ctx.js';

export function ground(ctx: FenCtx): void {
  const { pins } = ctx;

  // G1 THE TRODDEN GROUND. SENTENCE: a man let out to sit wears a
  // patch; a counter that takes coin wears one too.
  const c = pins.CAGE_WEAR;
  ctx.wear.ellipse(c.cx, c.cy, c.rx, c.ry);
  const k = pins.COUNTER_WEAR;
  ctx.wear.ellipse(k.cx, k.cy, k.rx, k.ry);

  // G2 THE SHOULDERS AT THE POST LINE. SENTENCE: every wain that was
  // stopped here pulled onto the verge to argue, and the verge shows it.
  const s = pins.POST_LINE_SHOULDERS;
  for (let y = s.y0; y <= s.y1; y++) {
    for (let x = s.x0; x <= s.x1; x++) {
      if (!ctx.onShoulder(x, y) || ctx.onBed(x, y)) continue;
      if (ctx.rng(x, y) < 0.6) ctx.put(x, y, Tile.Dirt);
    }
  }
  // The crew's stands. SENTENCE: the archer and the picket stand all
  // day either side of the gap, and a body that stands all day wears
  // its patch (fix pass 1; the def's `at` rows post them here).
  for (const [x, y] of pins.CREW_STANDS) ctx.put(x, y, Tile.Dirt);
  // The felling. SENTENCE: the crew cut the shoulder's treeline from
  // the post line to the water and south to their own clearing, for
  // the sight line between the camp's track and the gap and for the
  // fire; the grass came back, the trees did not. (Fix pass 1 ran the
  // fell to the rect's new south edge: an oak's crown paints seven
  // rows north of its trunk, and the rows y 94..97 buried the south
  // post, the teeth and the gap from the west.)
  const f = pins.BAR_FELL;
  ctx.fell(f.x0, f.y0, f.x1, f.y1);

  // G5 THE HEAD'S APRON. SENTENCE: the Charter cleared the bank for
  // its counter and the road walks up to it from the shoulder; the
  // counter's mouth and the clerk's stand are trodden whatever the
  // hash says.
  const a = pins.HEAD_APRON;
  ctx.wear.ellipse(a.cx, a.cy, a.rx, a.ry);
  ctx.wear.line(pins.HEAD_APPROACH, { width: 2 });
  // The bank behind the canvas cleared of its trees: the pennant is
  // there to be seen, and a canopy over it said nothing.
  const hf = pins.HEAD_FELL;
  ctx.fell(hf.x0, hf.y0, hf.x1, hf.y1);
  // And the approach south of the canvas (fix pass 1): the oak at
  // (129,83) stood between the bed and the counter and painted over
  // the pallets and the pennant; the Charter cleared its way to the
  // road.
  const hs = pins.HEAD_FELL_SOUTH;
  ctx.fell(hs.x0, hs.y0, hs.x1, hs.y1);
  for (const [x, y] of [pins.HEAD_STAND, pins.HEAD_CUSTOMER, pins.HEAD_MOUTH]) ctx.put(x, y, Tile.Dirt);
  // Ingram's stands at the dike line (L2's routine reads
  // pins.LINE_END_STAND and LINE_MIDDLE_STAND) are the field's own
  // ground: the bank's grass and the far rail's shallows. Nothing
  // authored there; a man standing in the water is the sentence.
}
