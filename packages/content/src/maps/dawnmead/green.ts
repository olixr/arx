/**
 * DAWNMEAD UNDER SIEGE (band 6) — green.ts [L2 WEST].
 *
 * D4 THE GREEN: the well court (kept, ruling 11), the bell bench, THE
 * TALLY STALL (new, ruling 10: the ONE MarketStall), the great oak
 * (kept), the fete's two north poles (kept), and the twins' ground.
 * The middle of the green stays empty: a green is the space (§9.3).
 *
 * Grass argued on (S7): Hilde on the bench, Margit at her lectern,
 * Leif on the verge, and ONE board, the DAWNMEAD post carrying the
 * tally on lines 2-4 because the engine cannot letter a NoticeBoard
 * (ruling Kit 5). THE HOMESTEAD WAY, THE PROVING WAY and THE COOK'S WAY
 * boards are CUT (J16).
 *
 * BOX (108,106)-(135,120): the brief's (107,106)-(137,123) trimmed by
 * one column west (x107 is the muster court's), two east (x136-137 are
 * the works' and the crofters' way in) and three rows south (y121-123
 * are the Road Row's and the cookhouse's); nothing of the green stands
 * on the trimmed cells.
 *
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G14 well court, G15 green wear (the court's pebbles, the inn's
 *   line, the stall's ellipse, the twins' patch, Hilde's way), G16
 *   forecourt edge, G17 the track's tail.
 * SIGNS IT QUEUES: DAWNMEAD (120,110) Signpost, four lines.
 * CAST HOOKS (people.ts places the bodies): Margit post (129.5,107.5)
 *   behind her lectern; Leif's stall stand (128.5,109.5) and bell
 *   stand (112.5,109.5); Hilde's bench (110,108) staged from (110,109);
 *   Tansy (118.5,111.5), Wick (128.5,115.5), the night ward
 *   (122.5,114.5); the twins' night stop (120,106) stays open.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands; gates open; wear is never a rectangle; one Signpost per
 * eyeful. CONTENT BOUNDARY holds; no dashes in any player-facing string.
 */
import { Detail, Tile, bannerPoleTile, bannerStandTile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function green(ctx: DawnCtx): void {
  const { b, pins } = ctx;
  const S = pins.SIGN_LEDGER;

  ctx.box(108, 106, 135, 120, 'green:D4 THE GREEN');

  // ==================================================================
  // THE WELL COURT (kept).
  // ==================================================================
  // SENTENCE: the village's one well on the world's centre, the bell
  // that rang twice this spring, the board where the parish pins what
  // it will not say aloud; stone only where fifty years of buckets
  // wore it (G14 laid the court).
  // PRIMARY the Well on the court (PIN; worldgen.test pins the world tile).
  b.set(pins.WELL.x, pins.WELL.y, Tile.Well);
  ctx.station(pins.WELL.x, pins.WELL.y);
  // SECONDARY the TownBell, the village's clock, KEPT (ruling 11).
  b.set(111, 107, Tile.TownBell);
  // The NoticeBoard KEPT (ruling 11): the Charter's chits are pinned on
  // it by Margit; the engine cannot letter it, so the tally rides the
  // DAWNMEAD post below.
  b.set(117, 107, Tile.NoticeBoard);
  // The stone bench on the court's east side, kept; the west one
  // (112,110) is CUT because Hilde's bench takes the bell's side.
  b.set(117, 110, Tile.StoneBench);
  // TERTIARY the pebbles (112,106) (116,106) (114,110): laid by G15
  // through the deferred queue; not repeated here.

  // SIGN: the DAWNMEAD post at the court's south hem, the eyeful's ONE
  // board; the village's line first, then Margit's hand (the tally,
  // lines 2-4, ruling Kit 5). Its south rows are the lane.
  ctx.sign(S.dawnmead.x, S.dawnmead.y, S.dawnmead.title, S.dawnmead.lines, S.dawnmead.tile);

  // ==================================================================
  // THE BELL BENCH.
  // ==================================================================
  // SENTENCE: Hilde reads the oil slate aloud at noon beside the bell
  // because the bell is the village's clock and names are read where
  // the hour is struck. SIT returner_hilde 11.25-13.5 at (110.5,108.5)
  // dir south, staged from (110,109) (the court's stone); (111,108)
  // stays open; the bell is north-east of it, never south.
  b.set(110, 108, Tile.Bench);

  // ==================================================================
  // THE TALLY STALL (new, ruling 10).
  // ==================================================================
  // SENTENCE: the Charter's tally clerk set her stall on the green's
  // east verge where the homestead track comes down to the lane,
  // because every cart from the farm and every cart turned back at the
  // fen waist passes this corner, and carts are what the Charter
  // counts; the village let it stand because a counted cart is still a
  // cart and because Margit pays for eggs. On its own worn ellipse
  // (G15), one row south of the forecourt's stone; no door there.
  // PRIMARY the ONE stall in the village: ledgers, oil, chits.
  b.set(pins.SINGLETONS.MarketStall.x, pins.SINGLETONS.MarketStall.y, Tile.MarketStall);
  // SECONDARY the slate, a run of two, under the stall's west side.
  b.set(127, 106, Tile.Table);
  b.set(128, 106, Tile.Table);
  // The lectern facing the lane: the posted number.
  b.set(128, 108, Tile.Lectern);
  // The fordgate's banner in weld (J10): the Charter's colour, never
  // madder.
  b.set(130, 107, bannerStandTile(pins.DYE_FORDGATE));
  // TERTIARY the road-tally crates: what turned back and was left with
  // her. x131 stays open between the crate and the track's tail x132.
  b.set(126, 108, Tile.CrateStack);
  b.set(130, 109, Tile.CrateGoods);
  // POSTS: Margit (129.5,107.5) behind her lectern, facing the lane;
  // Leif's stall stand (128.5,109.5) in front of it stays open (his
  // "three carts and a barrow" is said here). Nothing tall on
  // (129,108..109) south of her.
  ctx.post(129, 107);

  // ==================================================================
  // THE GREAT OAK (kept).
  // ==================================================================
  // SENTENCE: the oak the green grew round; the seats under it are
  // where the village sits to watch the stall and where the twins are
  // found when they are lost. The oak paints (133,106..107): grass.
  b.set(133, 108, Tile.TreeOak);
  b.set(131, 110, Tile.StoneBench);
  b.set(134, 116, Tile.Bench);
  // The one planter (§7.2), watered by Tansy because someone told her
  // it was hers. CUT: Bench (127,118), StreetPlanters (111,115)
  // (120,116) (125,109), FlowerBoxes (113,120) (129,121).
  b.set(132, 114, Tile.StreetPlanter);

  // ==================================================================
  // THE FETE'S TWO POLES (kept) and the green's lamps.
  // ==================================================================
  // SENTENCE: the village never took down the north pair from the last
  // fete; two of ten are enough to say a fete happened and nobody has
  // decided it will not again. CUT the south pair (108,122) (135,122).
  b.set(108, 106, bannerPoleTile(3));
  b.set(135, 106, bannerPoleTile(5));
  // The four lamps at the green's corners, verbatim: the cadence that
  // marches east from the Ring (S2) and the pair that light the
  // proving way's and the cook's way's mouths.
  b.set(109, 109, Tile.LampPost);
  b.set(134, 109, Tile.LampPost);
  b.set(109, 119, Tile.LampPost);
  b.set(134, 119, Tile.LampPost);
  // The muster court's east lamp is CUT (FIX PASS 1, defect 4): J7
  // moved the shipped (106,117) to (110,117), one col and two rows
  // from the green's own (109,119), and two lamps pooled as one at
  // night. The green's south-west corner lamp lights the proving
  // way's mouth on its own.
  // The green's flowers where the lane meets the grass, verbatim and
  // deferred so the thinning cannot take them. The shipped (128,116)
  // is NOT re-authored: it lies inside the twins' worn patch (G15) and
  // a flower on a trodden patch has no sentence.
  for (const [fx, fy] of [
    [110, 113], [116, 118], [122, 107], [131, 120], [119, 121], [135, 112],
  ] as const) ctx.detail(fx, fy, Detail.Flowers);

  // ==================================================================
  // THE TWINS' GROUND.
  // ==================================================================
  // SENTENCE: Tansy and Wick scamp on the green's south-east grass all
  // day and their game has worn one patch (G15 ellipse (127,116)); the
  // middle of the green is the space. Their night stop (120,106) is
  // open ground at the forecourt's foot; nothing stands within the
  // night ward's wander r2.
  ctx.post(118, 111); // twin_tansy (118.5,111.5) dir east, on the lane
  ctx.post(128, 115); // twin_wick (128.5,115.5) dir west, on the grass
  ctx.post(122, 114); // dawnmead_ward night (122.5,114.5) dir south
}
