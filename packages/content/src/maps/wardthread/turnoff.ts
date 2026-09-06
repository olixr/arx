/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — turnoff.ts.
 *
 * THE CAIRN THAT FELL (brief §2.8, 0.2 T; zone `turnoff`, its own
 * ZoneBuilder): two tiles and nothing else. The Waykeepers' claim
 * cairn where the order's path to its first tower left the High
 * Road, let fall when the tower was struck; no lamp, no crown, no
 * board, no body, no light. And a dead tree eleven rows north of the
 * bed, lateral to an east-west walker: the one silhouette on 175
 * lamped tiles between the fork and longmeadow_rest (§13.1 law 4),
 * and the only sign that anything ever left the road north. Never
 * "the one snag": the open cold north of the road is grass at this
 * seed, not old wood, and the census found no trunk in the rect.
 * It is also the landmark B1's journal names.
 *
 * SENTENCE OF THE PLACE: the road forgets the tower on purpose; the
 * ground does not.
 */
import { Tile } from '@arx/shared';
import type { WardCtx } from './ctx.js';

export function turnoff(ctx: WardCtx): void {
  const { pins } = ctx;
  ctx.box(-74, -180, -69, -171, 'turnoff: THE CAIRN THAT FELL');

  // PRIMARY: the fallen cairn on the north shoulder, 3.84 from the
  // wandered carve (listed). SENTENCE: the claim let fall; a mark, not
  // a way. Walkable: a walker can stand in it and feel nothing.
  ctx.put(pins.CAIRN[0], pins.CAIRN[1], Tile.CairnFallen);

  // SECONDARY: the dead tree, lateral. SENTENCE: the one silhouette on
  // the lamped miles, and it is dead.
  ctx.deadTree(pins.TURN_SNAG[0], pins.TURN_SNAG[1]);
}
