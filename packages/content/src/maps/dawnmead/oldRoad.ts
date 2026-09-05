/**
 * DAWNMEAD UNDER SIEGE (band 6) — oldRoad.ts [L6 ROADS + PEOPLE].
 *
 * D23 THE ROAD ROW + THE OLD ROAD BOARD + THE COLD CAMP + THE NOTCH
 * (brief §3 D23; boxes (108,121)-(110,149), (108,150)-(120,163),
 * (108,164)-(122,223), (98,190)-(107,223); rulings J6, J16, Kit 12).
 *
 * The old road to Kingsdelf leaves the green's south mouth worn hard
 * where feet go (the knoll, the graves, the lodge), squeezes past the
 * pell yard's rail, bends round the lodge's gable, then breaks to
 * single tiles with grass between, because past the lodge nobody
 * walks it who means to come back. Beside it, on grass, the village's
 * dead under one oak and this spring's new mound with no stone yet;
 * six rows south of their rail the one board on the road out; a cold
 * ring of stones where somebody waited a night; and two dead oaks
 * framing the way out of the wood.
 *
 * GROUND (L1 ground.ts): G44 the spur's three grades and the bend;
 * G45 the Row's grass, the mouth Dirt (109,156) and the four Tufts;
 * G46 the cold camp's ellipse (111,197, 3, 1.5).
 * SIGN: THE OLD ROAD (112,171) Signpost, three lines (pins; FIX PASS
 * 1 defect 2 moved it from (110,168): 23 rows from THE PELL YARD and
 * 25 cols from THE OLD GRANARY at the true 48x45 eyeful).
 * CAST HOOKS: the spur's PIN stops (107,121) (107,156) (107,162)
 * (107,174) stay Dirt; the fourth ward walks x107 to the lodge at
 * 19.25; Halla looks down the spur from the knoll bench (S3).
 * KEEP_OUT [108,148,120,164] and [98,190,118,223].
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function oldRoad(ctx: DawnCtx): void {
  const { b } = ctx;
  ctx.box(108, 121, 110, 149, 'oldRoad: THE SPUR (the hard grade past the court)');
  ctx.box(108, 150, 120, 163, 'oldRoad: THE ROAD ROW');
  ctx.box(108, 164, 122, 223, 'oldRoad: THE OLD ROAD BOARD + THE COLD CAMP + THE NOTCH east');
  ctx.box(98, 190, 107, 223, 'oldRoad: THE NOTCH west');
  ctx.keepOut(108, 148, 120, 164, 'the Road Row and its oak');
  ctx.keepOut(98, 190, 118, 223, 'the south notch widened (the cold camp, the two dead trees, the broken road)');

  // ================================================================
  // THE SPUR. SENTENCE: worn hard where feet go, squeezing past the
  // yard's rail and bending round the lodge's gable, then breaking to
  // single tiles with grass between, because past the lodge nobody
  // walks it who means to come back. GROUND (G44). PROPS: none on the
  // road, ever; the road is the scene.
  // ================================================================

  // ================================================================
  // THE ROAD ROW (the crofter's grave; no sign). SENTENCE: three older
  // stones cut fresh this year and a tall one under the shoulder's
  // oak, for people whose names the stones have kept better than the
  // village has; this spring the crofters' dead from the drowned
  // crofts came up the old road in a cart and went into the ground
  // nearest the road with no stone yet; the rail's gap stays open
  // because the row is not finished and because Halla counted her own
  // here once, out loud.
  // ================================================================
  // SECONDARY first, because the rail is the ground furniture the
  // stones stand inside: RailWood round x110..117 y150..162 with the
  // ONE gap (110,156) on the spur side, the open gate of a row that
  // is not finished (ruling Kit 14; pen() draws its gap last).
  ctx.pen(110, 150, 8, 13, { rail: Tile.RailWood, gaps: [{ side: 'w', at: 6 }] });
  // PRIMARY: the shoulder's oak at the north-east inside the rail,
  // the one tree the graves were dug under so the stones would have
  // shade to be read in; it stands north of every stone and paints
  // only the rail row and grass.
  b.set(115, 151, Tile.TreeOak);
  // The tall stone under the crown: the oldest name, cut deepest, and
  // the only one anybody still says aloud.
  b.set(113, 152, Tile.GravestoneTall);
  // Three older stones cut fresh this year, staggered and never a
  // line, because they went in one at a time over years.
  b.set(112, 155, Tile.Gravestone);
  b.set(115, 154, Tile.Gravestone);
  b.set(116, 157, Tile.Gravestone);
  // The new mound, nearest the road, with no stone yet: the crofters'
  // dead from the drowned crofts, who came up the old road in a cart.
  b.set(112, 159, Tile.GraveMound);
  // The stone bench at the south-east facing the stones: Hilde reads
  // here on the days she does not read on the green, and Gilly sits
  // here and does not say the name.
  b.set(116, 160, Tile.StoneBench);
  // TERTIARY: the cairn where the Row's mouth meets the spur's
  // shoulder, fen fashion, the crofters' mark on a place they mean to
  // come back to; low, so it hides nothing.
  b.set(109, 154, Tile.FieldCairn);
  // The mouth Dirt (109,156) and the four Tufts are G45's; the grass
  // inside is kept grass (graves stand on grass) and the flower
  // thinning clears the Row entirely (NO_FLOWER_ZONES).

  // ================================================================
  // THE OLD ROAD BOARD. SENTENCE: the one board on the road out, past
  // the graves, so you read it after you have understood what the
  // road costs; the Returners' voice, and Eskil raised it.
  // ================================================================
  // Nine rows south of the Row's rail on the east shoulder where the
  // hard wear ends, four cols off the spur (pins.SIGN_LEDGER.old_road;
  // J16, then FIX PASS 1 defect 2: (110,168) shared the true eyeful
  // with THE PELL YARD).
  const s = ctx.pins.SIGN_LEDGER.old_road;
  ctx.sign(s.x, s.y, s.title, s.lines, s.tile);

  // ================================================================
  // THE COLD CAMP. SENTENCE: someone came to walk the old road to
  // Kingsdelf, made a cold camp past the graves, and in the morning
  // walked back into the village; Hilde says it was a Returner, Gilly
  // says it was nobody she fed.
  // ================================================================
  // PRIMARY: the ring of stones on the east shoulder, three cols from
  // the spur's Dirt, on G46's trodden ellipse (ruling Kit 12).
  b.set(111, 197, Tile.ColdCamp);
  // TERTIARY: one tuft where the sleeper's feet flattened the grass.
  ctx.detail(113, 198, Detail.Tuft);

  // ================================================================
  // THE NOTCH. SENTENCE: the old road leaves through two dead oaks the
  // Returners girdled years back for their lamps' sight line, and the
  // wood has not closed the gap; the road out reads as a road into
  // something.
  // ================================================================
  // The two girdled oaks framing x107-108, five and more from the
  // road and off every routine; the edge woods stand dense either side
  // of the keep-out and never inside the notch band (ctx.deadTree
  // registers each as an occluder).
  ctx.deadTree(102, 218);
  ctx.deadTree(114, 218);
  // The exit (108,223) is G44's PIN: every row y191..223 carries Dirt
  // on x107 or x108 and the columns are adjacent, so the flood from
  // the spawn reaches the hem through the bend and the broken grade.
}
