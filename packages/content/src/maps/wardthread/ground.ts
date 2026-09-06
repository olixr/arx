/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — ground.ts.
 * THE GROUND FIRST, for the ward line's rect (brief §2.6 G1-G5).
 *
 * G0 the base is TILE_SKIP everywhere: the dying stand's yew and pine,
 *    the glade west of it, the tarn's rim east and the High Road's bed
 *    and shoulders show through every cell nobody authors. The border
 *    ring is never touched (lint.skipRing); no bed cell ever
 *    (lint.bedUntouched).
 * G1 THE BLIGHT is not this file's: it is the `wardthread_blight`
 *    stroke in geography.ts (the LG-0 grammar, skin only, no bones),
 *    the plateau over the stand's heart and the hem dying out ragged
 *    five to nine tiles. TAKEN at the thread, TOUCHED at the hem,
 *    never HELD: a stand that is dying, not dead.
 * G2 Dirt is not laid under the grey points: a GloomStone owns its
 *    cell, and the bruise (Detail.BlightVeins) on its cell and its
 *    four sides is what the ring brush lays (stones.ts).
 * G3 Bodil's yard: a Dirt ellipse under the camp and the face, and
 *    the wains' turn worn from the road's north shoulder to the lot
 *    post (the brush stops at the shoulder's edge; the bed is never
 *    painted). The canvas's west foot is trodden whatever the hash
 *    says (E5: a foot is open ground the author gave the prop).
 * G4 the drag furrows are the cut's own (cut.ts) — they cross the
 *    thread and the thread is whole.
 * G5 nothing under the thread: it is strung over the forest floor as
 *    found.
 * THE FELLS (the trunk law, pins.ts says why for each): the lot, the
 *    wains' approach, the rest's firewood south of the south leg, and
 *    the three stones' clearings. Trees only, ever.
 */
import { Tile } from '@arx/shared';
import type { WardCtx } from './ctx.js';

export function ground(ctx: WardCtx): void {
  const { pins } = ctx;

  // THE FELLS FIRST, so every wear brush and every prop lands on the
  // ground the crew and the keeper actually left.
  // SENTENCE: the crew cleared its lot; the cut face is the stumps.
  ctx.fell(pins.LOT_FELL, 'cut: THE LOT');
  // SENTENCE: the lot's road side cleared to the shoulder for the
  // wains that turn at the fork.
  ctx.fell(pins.APPROACH_FELL, 'cut: THE WAINS\' APPROACH');
  // SENTENCE: the keeper cuts the rest's fire from the verge across
  // the road and stops at the thread like everyone; nothing tall
  // stands between the junction and the head stone.
  ctx.fell(pins.FIREWOOD_FELL, 'line: THE REST\'S FIREWOOD');
  // SENTENCE: within two of a grey point nothing living stands; the
  // ring's dead are what stood there.
  pins.STONE_CLEARINGS.forEach((box, i) => ctx.fell(box, `stones: THE ${pins.STONES[i]!.id.toUpperCase()} STONE'S CLEARING`));

  // G3 THE YARD. SENTENCE: a camp of three and a sawhorse wear a yard
  // in a week; the glade was open before they came and is trodden now.
  const y = pins.YARD;
  ctx.wear.ellipse(y.cx, y.cy, y.rx, y.ry);
  // The wains' turn. SENTENCE: the cord goes out by the road, and the
  // wains that fetch it have worn their turn from the shoulder to the
  // post where the licence hangs.
  ctx.wear.line(pins.APPROACH, { width: 2 });
  // The fellers' walk. SENTENCE: from the face to the fire and back a
  // dozen times a day; the way from the stumps to the camp is worn
  // whatever the hash says, so the face feller's stand is not boxed
  // by the field (band 8 fix pass: his bed is a stop the sweep reads).
  ctx.wear.line(pins.FACE_WALK, { width: 1 });
  // The canvas's foot. SENTENCE: the skirt of the lean-to reaches
  // west and the ground under it is trodden bare.
  ctx.put(pins.CAMP.leanToFoot[0], pins.CAMP.leanToFoot[1], Tile.Dirt);
  // Bodil's stand and the fellers' cells: a body that stands all day
  // wears its patch (the fen waist's crew-stands law).
  for (const p of Object.values(pins.POSTS)) ctx.put(p.x, p.y, Tile.Dirt);
}
