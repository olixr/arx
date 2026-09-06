/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — cut.ts.
 *
 * THE LICENSED CUT (brief §2.7): the Charter's lot at the stand's west
 * skirt, a number on an ochre post, cut up to the thread and past it,
 * the cordwood racked for the wains that turn at the fork, one clamp
 * banked for Ottery's barrels, and a crew of six that is a licence
 * number. They camped where the wood was already open (the tape reads
 * damp glade west of x -153 on these rows), which is the sentence too.
 * The camp is thirty feet from where they lost one.
 *
 * GROUND (ground.ts): the yard, the wains' turn, the fells.
 * SIGN: none — the Charter's post is a post.
 * LIGHTS: the campfire and the clamp from dusk (flame-gated rows);
 * nothing on the line.
 * CAST HOOKS: Bodil's stand at the sawhorse's south cell facing it,
 * the fellers at the face and the second trunk (people.ts places
 * them; the cells are worn in ground.ts). Bodil's Bed under the
 * canvas; a Bed for each feller where the Bedrolls lay (0.2 K's own
 * fallback, taken in the band 8 fix pass).
 * E5: the canvas's second foot is WEST, (-160,-190), trodden and open.
 * EMPTY: the glade north and west of the camp; the road's shoulder.
 */
import { Detail, Tile } from '@arx/shared';
import type { WardCtx } from './ctx.js';

export function cut(ctx: WardCtx): void {
  const { pins } = ctx;
  // Four boxes, disjoint from the stones' rings: the rope and the
  // post on the road side, the lot behind them, the face along the
  // thread, and the two cut past it.
  ctx.box(-160, -186, -154, -185, 'cut: THE ROPE');
  ctx.box(-160, -199, -153, -187, 'cut: THE LOT');
  ctx.box(-152, -194, -151, -187, 'cut: THE FACE');
  ctx.box(-149, -191, -147, -187, 'cut: PAST THE THREAD');

  // PRIMARY: the lot post at the yard's road-side corner. SENTENCE:
  // ochre stake, brass plate, lot forty one; the licence reaches the
  // thread and the plate says so, in numbers.
  ctx.put(pins.LOT_POST[0], pins.LOT_POST[1], Tile.CharterPost);

  // PRIMARY: the rope, on rails along the road side. SENTENCE:
  // somebody leaves a knucklebone on it for every snag they take; the
  // bone is spoken (Bodil's rope node, the fellers' third line) and
  // never drawn (R12).
  for (const [x, y] of pins.ROPE) ctx.put(x, y, Tile.RailWood);

  // PRIMARY: the cut face. SENTENCE: cut to the thread, one tile from it.
  for (const [x, y] of pins.FACE_STUMPS) ctx.put(x, y, Tile.Stump);

  // PRIMARY: past the thread. SENTENCE: two cut past it and dragged
  // back across it; the furrow crosses the thread tile and the thread
  // is whole. You can step over it and so can a log. The fourth day's
  // cutting, on the ground.
  for (const [x, y] of pins.PAST_STUMPS) ctx.put(x, y, Tile.Stump);
  for (const [x, y] of pins.FURROWS) ctx.detail(x, y, Detail.DragFurrow);

  // SECONDARY: the sawhorse, Bodil's post. SENTENCE: where the cord is
  // cut to length; her post from six to six. A station for the lint.
  ctx.put(pins.SAWHORSE[0], pins.SAWHORSE[1], Tile.Sawhorse);
  ctx.station(pins.SAWHORSE[0], pins.SAWHORSE[1]);

  // SECONDARY: the two trunks. SENTENCE: dragged out this week; the
  // fellers work them.
  for (const [x, y] of pins.TRUNKS) ctx.put(x, y, Tile.FelledLog);

  // SECONDARY: the cord. SENTENCE: split and stacked for the wains;
  // the village's winter, in one rack, so far.
  ctx.put(pins.RACK[0], pins.RACK[1], Tile.LumberRack);

  // SECONDARY: the camp. SENTENCE: a camp, not a house; the boss under
  // canvas on a bed, two on frames the wains brought up, three of the
  // six on the wains. They sleep thirty feet from where they lost one.
  // (Band 8 fix pass: the two Bedrolls stood as declared wayside lies
  // and the audit found both fellers sitting on the ground beside
  // them; a Bed is the one tile a lie stop lands on, so each feller
  // has his frame, and SLEEPER STAYS IN BED holds for the three.)
  ctx.put(pins.CAMP.leanTo[0], pins.CAMP.leanTo[1], Tile.LeanTo);
  ctx.put(pins.CAMP.bed[0], pins.CAMP.bed[1], Tile.Bed);
  for (const [x, y] of pins.CAMP.beds) ctx.put(x, y, Tile.Bed);
  ctx.put(pins.CAMP.fire[0], pins.CAMP.fire[1], Tile.Campfire);

  // SECONDARY: the crew's burn. SENTENCE: one clamp of their own,
  // banked under turf; what will not split goes to Ottery by the
  // barrel. Cold by day, an exhale from dusk (K1). The pan sits IN its
  // ash: the four sides carry the ash, the bed's own cell none.
  const [ex, ey] = pins.CAMP.ember;
  ctx.emberBed(ex, ey);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) ctx.detail(ex + dx, ey + dy, Detail.Ash);

  // TERTIARY: the snags somebody takes. SENTENCE: dead standing wood
  // at the cut's north edge; one goes a night, a bone on the rope for
  // each. Nobody is authored taking them (0.2 L).
  for (const [x, y] of pins.CUT_SNAGS) ctx.deadTree(x, y);
}
