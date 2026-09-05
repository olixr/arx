/**
 * DAWNMEAD UNDER SIEGE (band 6) — quiet.ts [L6 ROADS + PEOPLE].
 *
 * D24 THE QUIET QUARTERS (brief §3 D24; §9.3): the breathing room,
 * kept empty on purpose. Four corners of the rect that hold an
 * eyeful of rest each: the rocky hem north-west of the orchard, the
 * high meadow under the north wood, the south meadow between the yard
 * and the hem, and the wold's south half across the water. Nothing
 * here is a vignette; the shipped "every corner holds a vignette"
 * lists are CUT and the scatter covers the ground. What stands is
 * verbatim from the shipped file (J19) plus one new dead crown.
 *
 * BOXES (trimmed where the brief's rects rode over a neighbour's):
 *   THE ROCKY HEM      (0,0)-(39,87)     brief (0,0)-(53,87); x40..53 is
 *                                        the orchard's (40,16)-(99,63)
 *                                        and every hem prop stands x<=30
 *   THE HIGH MEADOW    (100,0)-(160,13)  + (137,14)-(159,27) for the two
 *                                        oaks east of the fields
 *   THE SOUTH MEADOW   (123,190)-(165,223)
 *   THE WOLD'S SOUTH   (166,150)-(191,223)
 * GROUND: none (the scatter covers them).
 * SIGNS: none. CAST HOOKS: none.
 * KEEP_OUT [10,36,18,46] (the north-west hem's dead oak).
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function quiet(ctx: DawnCtx): void {
  const { b } = ctx;

  // ================================================================
  // THE ROCKY HEM. SENTENCE: north-west of the orchard, where the
  // rams come down; one grey crown among the rocks, because the
  // north-west is the direction nothing came from this year.
  // ================================================================
  ctx.box(0, 0, 39, 87, 'quiet: THE ROCKY HEM');
  ctx.keepOut(10, 36, 18, 46, "the north-west hem's dead oak");
  // The rocks the rams come down over, five of them, the hem's own
  // bones showing through the turf (verbatim).
  b.set(18, 24, Tile.Rock).set(24, 30, Tile.Rock).set(12, 34, Tile.Rock);
  b.set(30, 20, Tile.Rock).set(8, 44, Tile.Rock);
  // NEW: the one grey crown among the rocks, dead of nothing but age;
  // the hem's only tall thing, and off every route.
  ctx.deadTree(14, 40);
  // A mushroom in the rocks' shade and pebbles where the turf is thin
  // (verbatim; deferred so the scatter's RNG never buries them).
  ctx.detail(20, 27, Detail.Mushroom);
  ctx.detail(14, 32, Detail.Pebbles);
  ctx.detail(26, 22, Detail.Pebbles);
  ctx.detail(10, 40, Detail.Pebbles);
  // Long grass the rams have not reached yet (verbatim).
  b.set(16, 38, Tile.GrassTall).set(26, 44, Tile.GrassTall);
  // Three oaks between the hem and the orchard's hedge, the wood's
  // last outriders before the planted lines begin (verbatim).
  b.set(20, 56, Tile.TreeOak).set(30, 62, Tile.TreeOak).set(12, 68, Tile.TreeOak);
  // Flowers under the oaks, the orchard's escaped seed (verbatim).
  ctx.detail(24, 60, Detail.Flowers);
  ctx.detail(16, 64, Detail.Flowers);

  // ================================================================
  // THE HIGH MEADOW. SENTENCE: the stags are gone and an empty meadow
  // is the point.
  // ================================================================
  ctx.box(100, 0, 160, 13, 'quiet: THE HIGH MEADOW (the north hem)');
  ctx.box(137, 14, 159, 27, 'quiet: THE HIGH MEADOW (the two oaks east of the fields)');
  // The two oaks the stags browsed under, and nothing else but the
  // scatter: the shipped GrassTall and Flowers lists are CUT so the
  // emptiness reads (verbatim oaks).
  b.set(144, 20, Tile.TreeOak).set(154, 16, Tile.TreeOak);

  // ================================================================
  // THE SOUTH MEADOW. SENTENCE: the grass between the yard and the hem
  // that nobody has a use for; the road out is the only thing with a
  // direction.
  // ================================================================
  ctx.box(123, 190, 165, 223, 'quiet: THE SOUTH MEADOW');
  // The one oak east of the road (verbatim); the shipped oak (112,204)
  // is CUT because it sat in the notch band, and the shipped hand-laid
  // GrassTall and Flowers are CUT for the scatter to cover.
  b.set(130, 200, Tile.TreeOak);
  // The willow at the brook's south reach, leaning over the water the
  // way the wold's do (verbatim; two east of the shallow at y204).
  b.set(164, 204, Tile.TreeWillow);

  // ================================================================
  // THE WOLD'S SOUTH HALF. SENTENCE: open country south of the gate;
  // the dressing stops at the sacking row.
  // ================================================================
  ctx.box(166, 150, 191, 223, "quiet: THE WOLD'S SOUTH HALF");
  // The wold's two south oaks, the ones the ford's cairn was sighted
  // on (verbatim).
  b.set(170, 160, Tile.TreeOak).set(186, 176, Tile.TreeOak);
  // Long grass on the slope below the ford (the shipped (176,146)
  // stands one row north of this box's rim and is the gate's ground;
  // the brief's (176,152) is its honest kin inside the wold) and at
  // the second oak's foot (verbatim).
  b.set(176, 152, Tile.GrassTall).set(184, 158, Tile.GrassTall);
  // Flowers between the oaks, nobody's (verbatim).
  ctx.detail(172, 172, Detail.Flowers);
  // Nothing else east of the water south of the lane.
}
