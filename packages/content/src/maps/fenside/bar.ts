/**
 * THE FEN WAIST (contested lands, band 7) — bar.ts.
 *
 * THE TIER-2 CAIRN (brief §2.3; box (119,88)-(120,90)) and THE BAR
 * SCENE (brief §2.4; box (126,83)-(131,93)): the threshold marked with
 * a cairn and nothing else, then the Company's bar on the road's west
 * approach — two posts flanking the bed, three teeth leaving the one
 * tile gap, the counter that was a table, the board of receipts, the
 * cage and the drover roped beside it. The bar is the posts, the
 * barriers and the bodies (R2): no rope hangs between the posts
 * because no rope exists. THE MARK-POST AND THE RAGS (box
 * (132,83)-(137,84)): Brede's post in the water at the ford's north
 * lip, and the Company's rag line running up the shoulder to it.
 *
 * GROUND (ground.ts): G1 the two ellipses; G2 the worn shoulders.
 * SIGN: none. The Ashlamp's board is 68 tiles west; one per eyeful.
 * CAST HOOKS: the drover's seat (126,85), facing south (people.ts
 * places the body; ctx.post registers it for the occlusion lint).
 * LIGHTS: none of the zone's own; the camp's fire and torch lie south
 * in the trees.
 * EMPTY: the bed; the water; the north shoulder between the cairn and
 * the cage, six tiles of it.
 * THE CREW (fix pass 1): the archer and the picket are the bar's
 * garrison rows with named posts (first_road_bar.json `at`), standing
 * at (128,91) and (128,86) on the worn shoulders either side of the
 * gap; the zone authors the ground they stand on and nothing else.
 */
import { Tile } from '@arx/shared';
import type { FenCtx } from './ctx.js';

export function bar(ctx: FenCtx): void {
  const { pins } = ctx;

  // ================================================================
  // THE TIER-2 CAIRN. SENTENCE: the threshold marked with a cairn and
  // nothing else; nominally 192 tiles from the anchor and it stands
  // within five of it, alone on the north shoulder at the rect's west
  // edge, seven tiles before the bar comes into the eyeful (fix pass
  // 1: beside the cage it was the bar's clutter). No board, no light,
  // no body.
  // ================================================================
  ctx.box(119, 88, 120, 90, 'bar: THE TIER-2 CAIRN');
  ctx.put(pins.CAIRN[0], pins.CAIRN[1], Tile.FieldCairn);

  // ================================================================
  // THE BAR SCENE.
  // ================================================================
  ctx.box(126, 83, 131, 93, 'bar: THE BAR SCENE');

  // PRIMARY: the posts, two TimberPosts flanking the road on the bed's
  // outer cells. SENTENCE: the bar. No rope hangs between them because
  // no rope exists; the pair and the sentence are the bar (R2).
  for (const [x, y] of pins.TIMBER_POSTS) ctx.put(x, y, Tile.TimberPost);

  // PRIMARY: the teeth, SpikeBarrier on both shoulders and one stepped
  // onto the bed beside the south post. SENTENCE: the gap is (129,88),
  // one tile wide, the warden's gap. The road is never shut; it is
  // narrowed to one pair of boots (lint.gapOpen).
  for (const [x, y] of pins.TEETH) ctx.put(x, y, Tile.SpikeBarrier);

  // PRIMARY: the counter, the war table and the board of receipts, on
  // the north shoulder beside the cage (the block-out moved it off the
  // south shoulder, where worldgen's treeline buried it; pins.COUNTER).
  // SENTENCE: a counter that was a table. The board carries paper the
  // Company honours; the engine cannot letter it and does not need
  // to, because the receipts are in Brede's mouth.
  ctx.put(pins.COUNTER.table[0], pins.COUNTER.table[1], Tile.WarTable);
  ctx.put(pins.COUNTER.board[0], pins.COUNTER.board[1], Tile.NoticeBoard);

  // SECONDARY: the cage and the drover. SENTENCE: a drover who could
  // not pay, let out to sit where the road can see him. The cage
  // holds his wain's load; he holds the ground beside it (the roped
  // sit beside the cage is honest today; the server posts no body
  // inside a solid cell).
  ctx.put(pins.CAGE[0], pins.CAGE[1], Tile.PrisonCage);
  ctx.post(pins.DROVER_SEAT[0], pins.DROVER_SEAT[1]);

  // ================================================================
  // THE MARK-POST. SENTENCE: six lines a finger apart, cut the winter
  // the water came up. The lines are in Brede's mouth and the
  // drover's; the post stands in the water it measures and says
  // nothing. It stands in the channel north of the deck (G-2: the
  // client bakes the water beneath it), one column east of the
  // Charter's middle stake so the two never stack into one silhouette
  // (pins.MARK_POST).
  // ================================================================
  ctx.box(132, 82, 137, 84, 'bar: THE MARK-POST AND THE RAGS');
  ctx.put(pins.MARK_POST[0], pins.MARK_POST[1], Tile.TimberPost);

  // SECONDARY: the rag line, RedRagStake from the bar's shoulder to the
  // lip, the last one in the shallows. SENTENCE: the Company's reach
  // runs to the water and one rag into it, the week the Charter paid;
  // the last rag stands one tile from the Charter's rail.
  for (const [x, y] of pins.RAGS) ctx.put(x, y, Tile.RedRagStake);
}
