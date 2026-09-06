/**
 * DAWNMEAD UNDER SIEGE (band 6) — gate.ts [L6 ROADS + PEOPLE].
 *
 * D22 THE FIRST ROAD GATE + THE WOLD HEDGE + THE SACKING ROW
 * (brief §3 D22; box (160,83)-(191,149); rulings 7, 10, J10, J11, J12).
 *
 * The send-off, still: the last lamps, the old hound worn smooth, the
 * threshold stones; and this spring two banners in two dyes because
 * two orders both think the road is theirs, a Charter stake at the
 * milestone where carts are counted, and, first thing west of the
 * threshold, three families under sacking in the lee of a hedge leg
 * the crofters put up themselves.
 *
 * GROUND (L1 ground.ts): G6 the gate's Dirt shoulders (y110/y114
 * x170..188, the bridge feet); G40 the row's trodden ellipse
 * (167,106.5, 4.5, 2); G42 the ash pan (166..168,107..108); G4 the
 * ford's east approach.
 * SIGN: THE FIRST ROAD (182,116) Signpost, three lines (pins).
 * CAST HOOKS: Leif's post (186.5,109.5) beside the tally stake; crofter
 * A's post (166.5,107.5) by the coals (people.ts places both).
 * KEEP_OUT [160,83,191,110].
 *
 * One deviation from the brief's letter, noted: the row's DryingRack
 * stands at (169,108), two rows south of the brief's (169,106), because
 * at (169,106) it sealed the tile (169,105) between the two shelters
 * under the hedge (LeanTo west, FieldCot east, Hedge north): a camp
 * with a tile nobody can stand on fails the pocket flood; and at
 * (169,107), where fix pass 1 put it, it stood inside the belongings
 * cart's resting shafts once THE CART HAS TWO FEET (band 7, owed E5)
 * gave the cart its west foot, so the rack and the spill traded rows.
 */
import { Detail, Tile, bannerStandTile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function gate(ctx: DawnCtx): void {
  const { b } = ctx;
  ctx.box(160, 83, 191, 149, 'gate: THE FIRST ROAD GATE + THE WOLD HEDGE + THE SACKING ROW');
  ctx.keepOut(160, 83, 191, 110, "the wold hedge's south leg and the sacking row (widens the gate rect north and west)");

  // ================================================================
  // THE WOLD HEDGE AND ITS SOUTH LEG (ruling 7). PRIMARY.
  // ================================================================
  // The east wold's hedgerow, laid in Hobb's grandfather's time to turn
  // beasts off the lane: the west run and the north run, with the one
  // arch where the wold is walked into from the field (verbatim).
  for (let y = 84; y <= 100; y++) b.set(178, y, Tile.Hedge);
  for (let x = 178; x <= 188; x++) b.set(x, 84, Tile.Hedge);
  b.set(178, 92, Tile.HedgeGate);
  // NEW: the leg the crofters put up along the hedge's south face this
  // spring to break the north wind: west along y100 from the old
  // hedge's foot, south down x171, then west along y104 to the bank.
  // Its gate is on the wrong side for the field, which is how the
  // field knows the camp is not in it.
  for (let x = 172; x <= 177; x++) b.set(x, 100, Tile.Hedge);
  for (let y = 100; y <= 104; y++) b.set(171, y, Tile.Hedge);
  for (let x = 165; x <= 170; x++) b.set(x, 104, Tile.Hedge);
  // The gap (163..164,104) stays open to the bank: the water way the
  // three families fetch from. Nothing is placed on it.

  // SECONDARY: the two oaks the row sleeps under, north of the leg,
  // whose crowns are the lee the crofters chose the corner for.
  b.set(165, 101, Tile.TreeOak);
  b.set(169, 102, Tile.TreeOak);
  // The wold's own oak west of the field, the hedge's corner (verbatim).
  b.set(170, 90, Tile.TreeOak);
  // TERTIARY: nothing. The field (172..186, 85..99) is open grass on
  // purpose; the camp outside reads as outside because the field is
  // empty. One shipped clump of flowers east of the hedge's north run
  // stays where it grew.
  ctx.detail(188, 96, Detail.Flowers);

  // ================================================================
  // THE SACKING ROW (no sign; a DAY camp, ruling 7). On G40's ellipse.
  // ================================================================
  // PRIMARY: two lean-tos against the leg's face, open south, one to
  // each of the first two families that walked in off the drowned
  // crofts in the spring; the village gave them the hedge's lee and a
  // roof at night but not the green.
  b.set(164, 105, Tile.LeanTo);
  b.set(168, 105, Tile.LeanTo);
  // The third family's cot under the leg's corner, because by the time
  // they came there was no lean-to left to lend.
  b.set(170, 105, Tile.FieldCot);
  // SECONDARY: the fire is coals in a ring, never a Campfire, because a
  // campfire is the village's word for a hearth and this is not one;
  // smoke and glow from dusk, over the six-tile ash pan (G42; K1).
  ctx.emberBed(167, 107);
  // The trough at the bank side, filled from the water way through
  // the leg's gap; the ewes drink here before they are walked to the
  // Common.
  b.set(163, 106, Tile.WaterTrough);
  // A household on two wheels, backed under the corner by the cot: what
  // the third family still owns.
  b.set(170, 107, Tile.BelongingsCart);
  // THE ONE BROKEN CART (walker): the axle went at the gate lamps and
  // it never moved; it is the row's cart and the gate's, one sentence
  // for both, and Margit counted it turned.
  b.set(171, 108, Tile.BrokenCart);
  // TERTIARY: a bedroll rolled by the west lean-to's mouth; a day camp
  // has no lie tile, and the crofters lie on the crowded roof at night.
  b.set(165, 106, Tile.Bedroll);
  // The crate of what the first family carried out dry, under the
  // hedge between the shelters.
  b.set(166, 105, Tile.CrateGoods);
  // Where a load spilled off the belongings cart and stayed spilled:
  // under its own resting shafts, which is where a load slides off a
  // cart backed in on a slope. THE CART HAS TWO FEET (band 7, owed
  // E5): the cart's painter rests its shafts a tile to the west and
  // that tile is the cart's second foot; the rack that stood here
  // would have been inside the shafts, so the rack and the spill
  // traded places.
  b.set(169, 107, Tile.FieldLitter);
  // Sacking and blankets drying on the row's south rim where the sun
  // reaches past the hedge, one row further south than the spill so
  // the rack stands clear of the cart's shafts.
  b.set(169, 108, Tile.DryingRack);

  // Crofter A stands the coals by day, facing the lane he came in on;
  // his post tile is the pan's west cell (people.ts places the body).
  ctx.post(166, 107);

  // ================================================================
  // THE GATE. PRIMARY (verbatim, J19).
  // ================================================================
  // The last lamps: two pairs on the lane's verges, the village's
  // light going the other way from the Ring.
  b.set(172, 109, Tile.LampPost).set(172, 115, Tile.LampPost);
  b.set(184, 109, Tile.LampPost).set(184, 115, Tile.LampPost);
  // THE THRESHOLD: two old stones flank the road where the village's
  // last lamp gives out. Nobody built a gate here; the stones are it.
  b.set(189, 109, Tile.PillarStone).set(189, 115, Tile.PillarStone);
  // The stone bench every waker who ever left sat on for a minute.
  b.set(178, 109, Tile.StoneBench);
  // The old hound, the wayshrine worn smooth by hands going out.
  b.set(178, 115, Tile.WayShrine);
  // The milestone, worn past reading; the carts are counted here.
  b.set(186, 110, Tile.Rock);
  // The wayfarers' rest south of the lamps, where the road's people
  // wait for the light to be trimmed.
  b.set(180, 117, Tile.WayfarersRest);
  // SECONDARY (J10, ruling 10): the Waykeepers' woad by the shrine,
  // because Hale's order keeps the lamps and the shrine is theirs to
  // stand beside; the Charter's weld across the road from it, because
  // the fordgate counts the carts and will not stand under the other
  // order's colour. Never madder on any stand.
  b.set(179, 115, bannerStandTile(ctx.pins.DYE_WAYKEEPERS));
  b.set(180, 108, bannerStandTile(ctx.pins.DYE_FORDGATE));
  // The Charter's brass stake beside the milestone: the count is taken
  // where the cart passes the stone, and Leif chalks against it.
  b.set(187, 110, Tile.CharterPost);
  // The shipped dyed poles (185,108) (185,116) are CUT: they became
  // the two stands (ruling 9).
  // TERTIARY: pebbles where the wheels leave the Path (verbatim).
  ctx.detail(187, 111, Detail.Pebbles);
  ctx.detail(188, 114, Detail.Pebbles);
  ctx.detail(180, 110, Detail.Pebbles);
  ctx.detail(175, 114, Detail.Pebbles);

  // Leif stands the tally stake by day, chalk out, facing the village
  // he counts into; his night is the J12 fallback, the stand between
  // the threshold stones (190.5,112.5) facing east (people.ts).
  ctx.post(186, 109);

  // THE FIRST ROAD, the Waykeepers' board south of the lane between
  // the lamp pairs (pins.SIGN_LEDGER.first_road).
  const s = ctx.pins.SIGN_LEDGER.first_road;
  ctx.sign(s.x, s.y, s.title, s.lines, s.tile);

  // ================================================================
  // THE FORD'S CAIRN AND THE WOLD'S NORTH HALF.
  // ================================================================
  // The crofters came over the ford with their ewes because the bridge
  // has a ward on it, and one of them set a cairn on the east bank the
  // way fen folk mark a crossing they mean to come back over.
  b.set(167, 148, Tile.FieldCairn);
  ctx.detail(165, 147, Detail.Pebbles);
  // The wold's oaks between the gate and the ford (verbatim).
  b.set(174, 122, Tile.TreeOak);
  b.set(182, 134, Tile.TreeOak);
  // Long grass on the wold's slope and at the threshold's shoulder
  // (the shipped pair the brief assigns to D22).
  b.set(168, 130, Tile.GrassTall);
  b.set(190, 120, Tile.GrassTall);
  // The wold's flowers below the oak (verbatim).
  ctx.detail(180, 128, Detail.Flowers);
  // The willow at the crab bank's south foot, leaning over the water
  // (verbatim; D12 lists it once and hands it to gate.ts: it stands on
  // the crab bank's ground, so it is set only if that ground is still
  // grass when this lane runs, never over another lane's placement).
  if (b.get(165, 78) === Tile.Grass) b.set(165, 78, Tile.TreeWillow);
}
