import { Detail, Tile } from '@arx/shared';
import { SILVERFALL_RECT } from '../geography.js';
import { MARKET_STALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * SILVERFALL — the mountain capital, the third hearth of the
 * Dawnlands and the top of the great journey. The High Road climbs
 * five hundred tiles of frontier to reach a gate in the massif's
 * mouth, and behind that gate the city rises in FOUR TERRACES cut
 * into the living rock:
 *
 *   L0  THE GATEFRONT — walls, twin gate towers, the caravanserai,
 *       the gate market, and the Roaring Pool where the falls land.
 *   L1  THE WORKING TERRACE — the mine yard and smelter where the
 *       city earns its name in silver, the Great Forge, the
 *       artisans' hall, the cookhouse, and the Greenstair gardens.
 *   L2  THE HALL TERRACE — the Grand Court, the Bank of Silverfall,
 *       the Guildhall, the Arcanum, the Waykeepers' chapter house,
 *       the galleria — and the sealed mouth of the Undercroft.
 *   L3  THE HOLD — the High Hall, the Mirrormere whose overflow IS
 *       the falls, and the Silver Shrine.
 *
 * TERRACE LAW: the terraces are NESTED raises (L2 inside L1, L3
 * inside L2), so every rim is exactly ONE level and the auto-fence
 * reads clean everywhere; the north edges step down band by band,
 * leaving high LEDGE WALKS behind the upper terraces. Water NEVER
 * touches a rim — each channel stops at the lip and resumes in a
 * plunge basin below, which is exactly where the waterfall-curtain
 * set-piece (tracked debt) will hang. Stairs face south (the
 * camera-facing straight-edge law); the Silver Stair — three grand
 * nine-wide flights on one axis — carries the High Road from the
 * gate to the Hold.
 *
 * TOWN-PLAN LAWS (the Amberford laws, enforced here after the
 * curation pass):
 * - STREETS FIRST. Every working door fronts a street: the avenue,
 *   the L1 working lane (mine yard -> smelter -> forge -> bridges ->
 *   crafts row -> Greenstair), the L2 court walks, the L0 yard
 *   aprons. Buildings do not float on grass islands.
 * - NOTHING OVERLAPS. The pasture keeps three clear tiles off the
 *   bank; snow never eats a wall; the city wall runs tower-to-crag
 *   on both flanks and dies into solid scree ridges, not open lawn.
 * - ROOMS HAVE JOBS. One purpose per room, and the furniture proves
 *   it: the High Hall is a feast hall with an armory wing and a
 *   wardens' wing, the bank's counter breaks at a teller gate, the
 *   forge works furnace -> anvil -> quench in a line, the cookhouse
 *   door opens onto the mess terrace it feeds.
 *
 * The city is a HAVEN, not a settled hearth (the haven law): its
 * lamp pushes danger back inside the walls while the approach stays
 * tier 4-5 — the walk here is the game, arriving is the reward.
 * ZERO actors by design — the people arrive in Epic 6; buildings
 * carry their future keepers in comments.
 */
export function buildSilverfall(): ZoneDef {
  const R = SILVERFALL_RECT;
  const b = new ZoneBuilder('silverfall', 'Silverfall', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE TERRACES — nested plateaus; every rim one clean level.
  // Back ledges (y5; y7-9) are real walks behind the upper terraces.
  // ---------------------------------------------------------------
  b.raise(8, 4, 160, 92, 1); // L1: x8-167, y4-95
  b.raise(30, 6, 116, 58, 2); // L2: x30-145, y6-63
  b.raise(48, 10, 81, 22, 3); // L3: x48-128, y10-31

  // The Silver Stair — three grand flights on the avenue axis.
  for (let x = 84; x <= 92; x++) b.stairs(x, 95); // L0 -> L1
  for (let x = 84; x <= 92; x++) b.stairs(x, 63); // L1 -> L2
  for (let x = 84; x <= 92; x++) b.stairs(x, 31); // L2 -> L3
  // Working stairs: the mine climb and the Greenstair (L0 -> L1).
  for (let x = 18; x <= 20; x++) b.stairs(x, 95);
  for (let x = 152; x <= 154; x++) b.stairs(x, 95);
  // Side stairs to the Hall Terrace (L1 -> L2).
  for (let x = 36; x <= 38; x++) b.stairs(x, 63);
  for (let x = 136; x <= 138; x++) b.stairs(x, 63);

  // ---------------------------------------------------------------
  // THE AVENUE — the High Road continued: stone from gate to Hold,
  // lamped at a marching rhythm so the climb reads as one street.
  // ---------------------------------------------------------------
  b.fillRect(84, 96, 9, 16, Tile.StoneFloor); // gatefront stretch
  b.fillRect(84, 64, 9, 31, Tile.StoneFloor); // working stretch
  b.fillRect(84, 32, 9, 31, Tile.StoneFloor); // hall stretch
  b.fillRect(84, 26, 9, 5, Tile.StoneFloor); // hold landing
  // Brazier pairs light each landing — the stair burns, not lamps.
  b.set(83, 94, Tile.Brazier).set(93, 94, Tile.Brazier);
  b.set(83, 62, Tile.Brazier).set(93, 62, Tile.Brazier);
  b.set(83, 30, Tile.Brazier).set(93, 30, Tile.Brazier);
  // Lamp pairs between the landings pace out the long stretches.
  b.set(83, 40, Tile.LampPost).set(93, 40, Tile.LampPost);
  b.set(83, 52, Tile.LampPost).set(93, 52, Tile.LampPost);
  b.set(83, 70, Tile.LampPost).set(93, 70, Tile.LampPost);
  b.set(83, 80, Tile.LampPost).set(93, 80, Tile.LampPost);

  // ---------------------------------------------------------------
  // THE WATER — Mirrormere overflows south, terrace by terrace, and
  // every lip is a falls-to-be. Channels stop shy of every rim.
  // ---------------------------------------------------------------
  // L3: the Mirrormere — still, deep, and the city's whole reason.
  b.fillEllipse(98, 18, 13, 5.5, Tile.WaterShallow);
  b.fillEllipse(98, 18, 11, 4.5, Tile.Water);
  b.fillEllipse(98, 18, 7, 3, Tile.WaterDeep);
  b.fillRect(99, 23, 4, 7, Tile.Water); // the overflow race, to the lip at y30
  b.set(98, 24, Tile.WaterShallow).set(103, 24, Tile.WaterShallow);
  // L2: plunge basin under the Hold lip, then the court channel.
  b.fillEllipse(100, 34, 4, 2, Tile.WaterShallow);
  b.fillRect(99, 33, 4, 30, Tile.Water); // to the lip at y62
  b.set(98, 33, Tile.WaterShallow).set(103, 33, Tile.WaterShallow);
  b.fillRect(99, 32, 4, 1, Tile.WaterShallow); // basin tucks to the wall (foot-water law)
  // L1: plunge basin, then the working channel.
  b.fillEllipse(100, 66, 4, 2, Tile.WaterShallow);
  b.fillRect(99, 65, 4, 30, Tile.Water); // to the lip at y94
  b.set(98, 65, Tile.WaterShallow).set(103, 65, Tile.WaterShallow);
  b.fillRect(99, 64, 4, 1, Tile.WaterShallow); // basin tucks to the wall (foot-water law)
  // L0: the ROARING POOL — the whole mountain's water lands here.
  b.fillEllipse(104, 102, 12, 6.5, Tile.WaterShallow);
  b.fillEllipse(104, 102, 10, 5.5, Tile.Water);
  b.fillEllipse(104, 101, 6, 3.5, Tile.WaterDeep);
  // THE FOOT-WATER LAW: the plunge pocket tucks to the wall — the
  // ellipse's tangent left the fall's west column landing on bank
  // grass. A waterfall lands IN water; every south-facing spill is
  // asserted drop-0 by silverfall.test.ts.
  b.fillRect(98, 96, 6, 2, Tile.WaterShallow);
  // Bridges: the channel is crossed, never forded — and every bridge
  // lands on pavement, not lawn (the street law).
  for (let x = 98; x <= 103; x++) {
    b.set(x, 44, Tile.Bridge).set(x, 45, Tile.Bridge); // court -> guildhall
    b.set(x, 56, Tile.Bridge).set(x, 57, Tile.Bridge); // galleria crossing
    b.set(x, 74, Tile.Bridge).set(x, 75, Tile.Bridge); // forge -> artisans
    b.set(x, 86, Tile.Bridge).set(x, 87, Tile.Bridge); // yard -> mess terrace
  }
  b.fillRect(93, 56, 5, 2, Tile.StoneFloor); // avenue -> galleria bridge
  b.fillRect(104, 56, 2, 2, Tile.StoneFloor);
  b.fillRect(93, 74, 5, 2, Tile.Path); // avenue -> crafts bridge
  b.fillRect(93, 86, 5, 2, Tile.Path); // avenue -> mess bridge

  // ---------------------------------------------------------------
  // L3 — THE HOLD. The High Hall westward, the Silver Shrine east,
  // the mere between them. (High Warden Maren's seat, Epic 6.)
  // ---------------------------------------------------------------
  b.fillRect(52, 12, 29, 18, Tile.StoneFloor);
  b.outlineRect(52, 12, 29, 18, Tile.WallStone);
  b.set(52, 29, Tile.WallStoneDiagNE); // the front corners of the budget
  b.set(80, 29, Tile.WallStoneDiagNW);
  b.set(65, 29, Tile.DoorwayStoneWide).set(66, 29, Tile.DoorwayStoneWide);
  b.set(58, 29, Tile.WallStoneWindow).set(73, 29, Tile.WallStoneWindow);
  b.set(52, 17, Tile.WallStoneWindow).set(52, 24, Tile.WallStoneWindow);
  b.set(80, 17, Tile.WallStoneWindow).set(80, 24, Tile.WallStoneWindow);
  b.set(58, 12, Tile.WallStoneWindow).set(73, 12, Tile.WallStoneWindow);
  // Two partition walls carve three rooms with three jobs: armory,
  // GREAT HALL, wardens' quarters. The south gallery joins them.
  for (let y = 13; y <= 25; y++) b.set(58, y, Tile.WallStone);
  b.set(58, 20, Tile.DoorwayStone);
  for (let y = 13; y <= 25; y++) b.set(74, y, Tile.WallStone);
  b.set(74, 20, Tile.DoorwayStone);
  // THE GREAT HALL (x59-73): twin hearths flank the moot dais, and
  // two long feast tables run the floor with a rugged central aisle.
  b.set(61, 13, Tile.Hearth).set(71, 13, Tile.Hearth);
  b.set(64, 13, Tile.BannerPole).set(68, 13, Tile.BannerPole);
  b.set(66, 13, Tile.Lectern);
  b.setDetail(65, 14, Detail.Rug).setDetail(66, 14, Detail.Rug).setDetail(67, 14, Detail.Rug);
  for (let y = 17; y <= 23; y++) b.set(62, y, Tile.Table).set(70, y, Tile.Table);
  b.set(62, 16, Tile.Chair).set(62, 24, Tile.Chair);
  b.set(70, 16, Tile.Chair).set(70, 24, Tile.Chair);
  b.set(61, 18, Tile.Chair).set(61, 21, Tile.Chair);
  b.set(63, 19, Tile.Chair).set(63, 22, Tile.Chair);
  b.set(69, 19, Tile.Chair).set(69, 22, Tile.Chair);
  b.set(71, 18, Tile.Chair).set(71, 21, Tile.Chair);
  for (const y of [18, 21, 24]) {
    b.setDetail(65, y, Detail.Rug).setDetail(66, y, Detail.Rug);
  }
  b.setDetail(65, 28, Detail.Doormat).setDetail(66, 28, Detail.Doormat);
  // THE ARMORY WING (x53-57): the Hold's steel, racked and counted.
  b.set(53, 14, Tile.WeaponRack).set(53, 16, Tile.WeaponRack).set(53, 18, Tile.WeaponRack);
  b.set(53, 21, Tile.ToolRack);
  b.set(56, 13, Tile.Cabinet);
  b.set(54, 23, Tile.Table).set(54, 24, Tile.Chair);
  b.set(56, 25, Tile.CrateGoods);
  b.set(53, 24, Tile.Brazier);
  // THE WARDENS' QUARTERS (x75-79): three cots, footlockers, a
  // warm brazier — no feasting in here, the hall is next door.
  b.set(78, 14, Tile.Bed).set(78, 18, Tile.Bed).set(78, 22, Tile.Bed);
  b.set(76, 14, Tile.Crate).set(76, 18, Tile.Crate);
  b.set(79, 13, Tile.Cabinet).set(75, 13, Tile.Bookshelf);
  b.setDetail(77, 20, Detail.RugRound);
  b.set(75, 24, Tile.Brazier);
  // The south gallery: benches for those waiting on the moot.
  b.set(56, 27, Tile.Bench).set(75, 27, Tile.Bench);
  // Hall front: a paved forecourt strip — the y30 row is the Hold's
  // only east-west walk, so NOTHING solid stands on it (the sealed-
  // pocket law: the banners live inside, on the dais).
  b.fillRect(62, 30, 8, 1, Tile.StoneFloor);
  b.setDetail(65, 30, Detail.Doormat).setDetail(66, 30, Detail.Doormat);
  // The SILVER SHRINE: a tight pillar ring on the mere's east shore,
  // reached by its own pilgrim path off the hold landing. The ring
  // closes around a stone floor, a hearthfire, and two benches.
  b.fillRect(94, 25, 24, 1, Tile.Path);
  for (let x = 99; x <= 102; x++) b.set(x, 25, Tile.Bridge); // over the race
  b.fillRect(117, 22, 2, 3, Tile.Path);
  b.fillRect(116, 17, 5, 5, Tile.StoneFloor);
  b.set(115, 14, Tile.PillarStone).set(121, 14, Tile.PillarStone);
  b.set(113, 18, Tile.PillarStone).set(123, 18, Tile.PillarStone);
  b.set(115, 22, Tile.PillarStone).set(121, 22, Tile.PillarStone);
  b.set(118, 19, Tile.Brazier);
  b.set(116, 21, Tile.Bench).set(120, 21, Tile.Bench);
  b.set(116, 17, Tile.FlowerBox).set(120, 17, Tile.FlowerBox);
  // Mirrormere dressing: the willows, the still-water fishing.
  b.set(88, 12, Tile.TreeWillow).set(110, 13, Tile.TreeWillow).set(84, 23, Tile.TreeWillow);
  b.set(90, 23, Tile.FishingSpot).set(106, 15, Tile.FishingSpot);
  // Snow holds the high ground all year — clear of every wall.
  b.fillRect(49, 26, 3, 2, Tile.Snow).fillRect(124, 12, 3, 2, Tile.Snow);
  b.fillRect(108, 27, 4, 2, Tile.Snow).fillRect(113, 26, 3, 1, Tile.Snow);

  // ---------------------------------------------------------------
  // THE HIGH LEDGES — the walks behind the terraces, snow-bitten.
  // ---------------------------------------------------------------
  for (let x = 10; x <= 165; x += 7) {
    if ((x * 7) % 3 === 0) b.fillRect(x, 5, 2, 1, Tile.Snow);
  }
  b.fillRect(34, 7, 3, 2, Tile.Snow).fillRect(70, 8, 3, 1, Tile.Snow);
  b.fillRect(120, 7, 4, 2, Tile.Snow).fillRect(140, 8, 2, 1, Tile.Snow);
  b.set(52, 8, Tile.Rock).set(98, 7, Tile.Rock).set(130, 8, Tile.Rock);
  b.set(24, 5, Tile.Rock).set(112, 5, Tile.Rock);

  // ---------------------------------------------------------------
  // L2 — THE HALL TERRACE.
  // ---------------------------------------------------------------
  // The GRAND COURT: the plaza at the stair crown. The silver
  // fountain is a real basin now — water in a stone square, flower
  // boxes at its corners, benches facing the spray.
  b.fillRect(70, 32, 28, 17, Tile.StoneFloor);
  b.set(78, 39, Tile.WaterShallow).set(79, 39, Tile.WaterShallow);
  b.set(78, 40, Tile.WaterShallow).set(79, 40, Tile.WaterShallow);
  b.set(76, 37, Tile.FlowerBox).set(81, 37, Tile.FlowerBox);
  b.set(76, 42, Tile.FlowerBox).set(81, 42, Tile.FlowerBox);
  b.set(77, 36, Tile.Bench).set(80, 36, Tile.Bench);
  b.set(77, 43, Tile.Bench).set(80, 43, Tile.Bench);
  b.sign(72, 37, 'THE GRAND COURT', ['moot days posted here']);
  b.set(72, 33, Tile.BannerPole).set(95, 33, Tile.BannerPole);
  b.set(72, 47, Tile.LampPost).set(95, 47, Tile.LampPost);
  // The east court: a quiet planter nook off the guildhall bridge.
  b.set(95, 37, Tile.FlowerBox);
  b.set(94, 40, Tile.Bench).set(96, 40, Tile.Bench);
  // THE BANK OF SILVERFALL fronts the court from the west — the
  // mountain's coin sleeps here. (Bursar Odele's post, Epic 6.)
  b.fillRect(44, 33, 21, 16, Tile.StoneFloor);
  b.outlineRect(44, 33, 21, 16, Tile.WallStone);
  b.set(64, 33, Tile.WallStoneDiagSW); // court-facing shoulders
  b.set(64, 48, Tile.WallStoneDiagNW);
  b.set(64, 40, Tile.DoorwayStone).set(64, 41, Tile.DoorwayStone);
  b.set(64, 36, Tile.WallStoneWindow).set(64, 45, Tile.WallStoneWindow);
  b.set(50, 33, Tile.WallStoneWindow).set(57, 33, Tile.WallStoneWindow);
  b.set(50, 48, Tile.WallStoneWindow).set(57, 48, Tile.WallStoneWindow);
  // The vault: windowless, double-walled from the working floor.
  for (let y = 34; y <= 47; y++) b.set(49, y, Tile.WallStone);
  b.set(49, 40, Tile.DoorwayStone);
  b.set(45, 35, Tile.Vault).set(45, 38, Tile.Vault).set(45, 41, Tile.Vault).set(45, 44, Tile.Vault);
  b.set(47, 34, Tile.CrateGoods).set(47, 46, Tile.CrateGoods).set(45, 47, Tile.Cabinet);
  // The working floor behind the counter: teller desks and the
  // ledger wall. The counter BREAKS at y40 — the teller gate lines
  // up with the vault door and the front door in one working axis.
  for (const y of [37, 38, 39, 41, 42, 43]) b.set(54, y, Tile.Counter);
  b.set(50, 34, Tile.Bookshelf).set(51, 34, Tile.Bookshelf).set(52, 34, Tile.Bookshelf);
  b.set(51, 37, Tile.Table).set(52, 37, Tile.Chair);
  b.set(51, 43, Tile.Table).set(52, 43, Tile.Chair);
  b.set(50, 47, Tile.Cabinet).set(51, 47, Tile.Cabinet);
  // The lobby: public ledgers, the waiting bench, the bank chests.
  b.set(57, 36, Tile.BankChest).set(57, 44, Tile.BankChest).set(62, 34, Tile.BankChest);
  b.set(58, 34, Tile.Bookshelf).set(59, 34, Tile.Bookshelf);
  b.set(60, 46, Tile.Bench).set(61, 46, Tile.Bench);
  b.setDetail(58, 40, Detail.Rug).setDetail(59, 40, Detail.Rug);
  b.setDetail(58, 41, Detail.Rug).setDetail(59, 41, Detail.Rug);
  b.setDetail(63, 40, Detail.Doormat).setDetail(63, 41, Detail.Doormat);
  b.set(66, 38, Tile.LampPost).set(66, 43, Tile.LampPost); // the bank's own lamps
  // THE GUILDHALL fronts the court from the east, across the falls
  // bridge — every trade's charter under one roof. (Epic 6 masters.)
  b.fillRect(106, 34, 22, 16, Tile.StoneFloor);
  b.outlineRect(106, 34, 22, 16, Tile.WallStone);
  b.set(106, 41, Tile.DoorwayStone).set(106, 42, Tile.DoorwayStone);
  b.set(106, 37, Tile.WallStoneWindow).set(106, 46, Tile.WallStoneWindow);
  b.set(112, 34, Tile.WallStoneWindow).set(121, 34, Tile.WallStoneWindow);
  b.set(112, 49, Tile.WallStoneWindow).set(121, 49, Tile.WallStoneWindow);
  b.set(127, 38, Tile.WallStoneWindow).set(127, 45, Tile.WallStoneWindow);
  b.fillRect(104, 41, 2, 5, Tile.StoneFloor); // door walk to the bridge
  // The charter floor: the great table holds the middle, the trades'
  // library lines the north, and the seal counter works the south.
  for (let yy = 35; yy <= 48; yy++) b.set(122, yy, Tile.WallStone);
  b.set(122, 41, Tile.DoorwayStone);
  for (let x = 112; x <= 118; x++) b.set(x, 35, Tile.Bookshelf);
  b.set(108, 35, Tile.BannerPole);
  b.set(112, 40, Tile.Table).set(113, 40, Tile.Table).set(114, 40, Tile.Table).set(115, 40, Tile.Table);
  b.set(112, 41, Tile.Table).set(113, 41, Tile.Table).set(114, 41, Tile.Table).set(115, 41, Tile.Table);
  b.set(111, 40, Tile.Chair).set(111, 41, Tile.Chair);
  b.set(116, 40, Tile.Chair).set(116, 41, Tile.Chair);
  b.set(113, 39, Tile.Chair).set(114, 39, Tile.Chair);
  b.set(113, 42, Tile.Chair).set(114, 42, Tile.Chair);
  b.set(108, 45, Tile.Counter).set(109, 45, Tile.Counter).set(110, 45, Tile.Counter);
  b.set(108, 47, Tile.Table).set(109, 47, Tile.Chair);
  b.setDetail(107, 41, Detail.Doormat).setDetail(107, 42, Detail.Doormat);
  // The records room (x123-126): charters, deeds, and dust.
  b.set(126, 38, Tile.Cabinet).set(126, 43, Tile.Cabinet).set(123, 47, Tile.Cabinet);
  b.set(124, 35, Tile.Bookshelf).set(125, 35, Tile.Bookshelf);
  b.set(124, 44, Tile.Table).set(125, 44, Tile.Chair);
  b.set(126, 47, Tile.CrateGoods);
  // THE ARCANUM: the enchanters' house on the southwest walk — runes
  // burn brighter this high. (Enchantress Solvei's post, Epic 6.)
  b.fillRect(34, 51, 13, 10, Tile.StoneFloor);
  b.outlineRect(34, 51, 13, 10, Tile.WallStone);
  b.set(46, 55, Tile.DoorwayStone);
  b.set(39, 51, Tile.WallStoneWindow).set(34, 56, Tile.WallStoneWindow);
  b.set(39, 60, Tile.WallStoneWindow);
  b.set(37, 54, Tile.EnchantingTable);
  b.set(35, 52, Tile.Bookshelf).set(36, 52, Tile.Bookshelf);
  b.set(43, 52, Tile.Bookshelf).set(44, 52, Tile.Bookshelf);
  b.setDetail(39, 56, Detail.RugRound); // the casting circle
  b.set(41, 57, Tile.Table).set(42, 57, Tile.Chair);
  b.set(44, 58, Tile.Cabinet);
  b.set(35, 59, Tile.Brazier).set(44, 59, Tile.Brazier);
  b.setDetail(45, 55, Detail.Doormat);
  b.set(48, 55, Tile.LampPost);
  // THE WAYKEEPERS' CHAPTER HOUSE: the order that walks every mile
  // of the roads answers to this room. (Marshal Kestrel, Epic 6.)
  b.fillRect(66, 52, 15, 10, Tile.StoneFloor);
  b.outlineRect(66, 52, 15, 10, Tile.WallStone);
  b.set(72, 52, Tile.DoorwayStone).set(73, 52, Tile.DoorwayStone);
  b.set(69, 52, Tile.WallStoneWindow).set(77, 52, Tile.WallStoneWindow);
  b.set(66, 57, Tile.WallStoneWindow).set(80, 57, Tile.WallStoneWindow);
  b.set(67, 53, Tile.WeaponRack).set(67, 55, Tile.WeaponRack).set(67, 57, Tile.WeaponRack);
  b.set(71, 56, Tile.Table).set(72, 56, Tile.Table); // the road map table
  b.set(70, 56, Tile.Chair).set(73, 56, Tile.Chair);
  b.set(77, 53, Tile.Bookshelf).set(79, 53, Tile.Cabinet); // the duty ledgers
  b.set(76, 60, Tile.Bed).set(79, 60, Tile.Bed);
  b.set(69, 60, Tile.Brazier);
  b.setDetail(72, 53, Detail.Doormat).setDetail(73, 53, Detail.Doormat);
  b.set(70, 51, Tile.BannerPole).set(75, 51, Tile.BannerPole);
  // The L2 court walks: bank front -> arcanum, court -> chapter
  // house. Streets first — both doors open onto pavement.
  b.fillRect(48, 49, 22, 2, Tile.StoneFloor);
  b.fillRect(47, 51, 2, 5, Tile.StoneFloor);
  b.fillRect(71, 49, 3, 3, Tile.StoneFloor);
  // THE GALLERIA: the upper market — TWO facing stall rows with a
  // lamped walk between, everything the mine and road bring in.
  b.fillRect(106, 53, 34, 8, Tile.StoneFloor);
  b.stamp(MARKET_STALL, 109, 53);
  b.stamp(MARKET_STALL, 117, 53);
  b.stamp(MARKET_STALL, 125, 53);
  b.stamp(MARKET_STALL, 133, 53);
  b.stamp(MARKET_STALL, 113, 58);
  b.stamp(MARKET_STALL, 121, 58);
  b.stamp(MARKET_STALL, 129, 58);
  b.set(107, 56, Tile.LampPost).set(138, 57, Tile.LampPost);
  b.set(137, 54, Tile.Bench).set(107, 59, Tile.Barrel);
  // THE UNDERCROFT MOUTH — the way down, OPEN since Epic 5: the
  // Masons' Guild broke its own seal and the stair breathes again.
  // The mouth sits in its own rock knoll so the mountain face OWNS
  // it: cave mass, flanking crag stones, scree at the foot. The
  // portal behind the arch drops you at the Landing; its twin down
  // there brings you home to this apron.
  b.fillRect(33, 13, 11, 6, Tile.CaveWall);
  b.set(38, 18, Tile.ArchStone);
  b.portal(38, 17, Tile.PortalDown, { x: -333.5, y: 552.5 }); // down to the Landing
  b.set(31, 16, Tile.Rock).set(32, 18, Tile.Rock).set(31, 19, Tile.Rock);
  b.set(44, 16, Tile.Rock).set(45, 18, Tile.Rock).set(45, 20, Tile.Rock);
  b.fillRect(35, 12, 3, 1, Tile.Snow).fillRect(40, 12, 2, 1, Tile.Snow);
  b.fillRect(36, 19, 5, 2, Tile.StoneFloor);
  b.set(36, 19, Tile.Brazier).set(40, 19, Tile.Brazier);
  b.sign(38, 21, 'THE UNDERCROFT', ['mind the step,', 'mind the kobolds']);
  b.set(34, 20, Tile.CaveRubble).set(42, 20, Tile.CaveRubble);
  b.setDetail(35, 21, Detail.Pebbles).setDetail(41, 22, Detail.Pebbles);
  b.setDetail(33, 21, Detail.Pebbles);
  // THE CRAG PASTURE: the west-arm shelf where the city's rams keep
  // the grass down. Three clear tiles between fence and bank wall —
  // the no-overlap law — and the gate opens south, away from coin.
  b.outlineRect(31, 26, 10, 13, Tile.Fence);
  b.set(35, 38, Tile.Grass); // the gate, south
  b.set(32, 28, Tile.Basin);
  b.setDetail(33, 31, Detail.Straw).setDetail(37, 34, Detail.Straw);
  b.fillRect(31, 35, 2, 2, Tile.Snow);
  // The east promenade: lamps and yews along the hall-terrace walk.
  b.set(141, 40, Tile.TreeYew).set(141, 58, Tile.TreeYew).set(143, 62, Tile.TreeYew);
  b.set(134, 36, Tile.LampPost).set(141, 48, Tile.Bench);
  b.set(60, 51, Tile.TreeYew).set(50, 56, Tile.TreeYew);

  // ---------------------------------------------------------------
  // L1 — THE WORKING TERRACE: silver first, everything else after.
  // The WORKING LANE strings the whole terrace onto one street:
  // mine yard -> smelter -> forge -> bridges -> crafts -> gardens.
  // ---------------------------------------------------------------
  b.fillRect(12, 82, 72, 2, Tile.Path); // the west working lane
  b.fillRect(104, 66, 2, 16, Tile.Path); // the crafts spine (bridge -> doors)
  b.fillRect(104, 80, 49, 2, Tile.Path); // the east working lane
  b.fillRect(104, 86, 12, 2, Tile.Path); // bridge -> mess terrace
  b.fillRect(134, 70, 2, 10, Tile.Path); // dispensary spur
  b.fillRect(150, 71, 1, 10, Tile.Path); // Greenstair gate spur
  // THE MINE YARD: the open workings under the west cliffs. Ore
  // stands in WORKING FACES with shoring, spoil heaps, and a loading
  // corner by the smelter — not a sprinkle. (Foreman Grettir.)
  b.fillRect(10, 66, 36, 27, Tile.Dirt);
  // The northwest face.
  b.set(12, 69, Tile.RockSilver).set(14, 72, Tile.RockSilver);
  b.set(11, 76, Tile.RockIron).set(12, 79, Tile.RockCoal);
  b.set(17, 71, Tile.PillarStone); // shoring
  b.set(15, 75, Tile.CaveRubble).set(16, 76, Tile.CaveRubble); // spoil
  b.setDetail(14, 74, Detail.Pebbles).setDetail(16, 70, Detail.Pebbles);
  // The south face.
  b.set(14, 87, Tile.RockSilver).set(22, 89, Tile.RockSilver);
  b.set(16, 90, Tile.RockGold).set(24, 86, Tile.RockIron).set(20, 85, Tile.RockCoal);
  b.set(24, 84, Tile.PillarStone);
  b.set(23, 87, Tile.CaveRubble).set(18, 89, Tile.CaveRubble);
  b.setDetail(19, 87, Detail.Pebbles).setDetail(21, 91, Detail.Pebbles);
  // The northeast seam and the loading corner by the smelter door.
  b.set(27, 70, Tile.RockSilver);
  b.set(29, 80, Tile.Crate).set(30, 81, Tile.Crate).set(31, 79, Tile.Crate);
  b.set(30, 78, Tile.ToolRack).set(28, 79, Tile.Barrel);
  b.set(19, 78, Tile.Brazier).set(15, 88, Tile.Brazier);
  // THE SMELTER HALL: three furnaces on the north wall, charge bins
  // between them, the slag trough east, the tally desk south.
  b.fillRect(32, 66, 17, 13, Tile.StoneFloor);
  b.outlineRect(32, 66, 17, 13, Tile.WallStone);
  b.set(39, 78, Tile.DoorwayStoneWide).set(40, 78, Tile.DoorwayStoneWide);
  b.set(35, 78, Tile.WallStoneWindow).set(44, 78, Tile.WallStoneWindow);
  b.set(32, 71, Tile.WallStoneWindow).set(48, 71, Tile.WallStoneWindow);
  b.set(34, 68, Tile.Furnace).set(38, 68, Tile.Furnace).set(42, 68, Tile.Furnace);
  b.set(36, 68, Tile.CrateGoods).set(40, 68, Tile.CrateGoods); // the charge bins
  b.set(45, 68, Tile.Basin); // the slag trough
  b.set(45, 74, Tile.CrateGoods).set(46, 76, Tile.CrateGoods); // ingots, stacked
  b.set(34, 75, Tile.Counter).set(35, 75, Tile.Counter).set(36, 75, Tile.Counter);
  b.set(35, 74, Tile.Chair).set(33, 76, Tile.Cabinet); // the tally desk
  b.setDetail(39, 79, Detail.Doormat).setDetail(40, 79, Detail.Doormat);
  b.setDetail(40, 71, Detail.Pebbles).setDetail(43, 73, Detail.Pebbles);
  b.fillRect(39, 79, 2, 3, Tile.Path); // doorstep to the lane
  b.sign(37, 80, 'THE SMELTER', ['pour days: all of them']);
  // THE MASONS' YARD: stone stock on the west row, benches facing,
  // finished work crated, the rubble heap where it belongs.
  b.fillRect(32, 84, 15, 9, Tile.Dirt);
  b.set(34, 86, Tile.PillarStone).set(34, 90, Tile.PillarStone); // stock
  b.set(36, 86, Tile.Crate).set(36, 90, Tile.Crate); // rough blocks
  b.set(39, 86, Tile.Workbench).set(39, 90, Tile.Workbench);
  b.set(43, 86, Tile.CrateGoods); // finished ashlar
  b.set(44, 90, Tile.CaveRubble).set(45, 91, Tile.CaveRubble);
  b.setDetail(37, 88, Detail.Pebbles).setDetail(42, 91, Detail.Pebbles);
  // THE GREAT FORGE: the mountain's anvils, working in a line —
  // furnace to anvil to quench. (Forgemistress Balla, Epic 6.)
  b.fillRect(54, 66, 21, 15, Tile.StoneFloor);
  b.outlineRect(54, 66, 21, 15, Tile.WallStone);
  b.set(63, 80, Tile.DoorwayStoneWide).set(64, 80, Tile.DoorwayStoneWide);
  b.set(58, 80, Tile.WallStoneWindow).set(70, 80, Tile.WallStoneWindow);
  b.set(54, 71, Tile.WallStoneWindow).set(54, 76, Tile.WallStoneWindow);
  b.set(74, 71, Tile.WallStoneWindow).set(59, 66, Tile.WallStoneWindow).set(69, 66, Tile.WallStoneWindow);
  b.set(56, 69, Tile.Furnace).set(56, 74, Tile.Furnace);
  b.set(55, 67, Tile.Crate).set(55, 76, Tile.Crate); // the coal
  b.set(59, 69, Tile.Anvil).set(59, 74, Tile.Anvil).set(62, 71, Tile.Anvil);
  b.set(61, 69, Tile.Basin).set(61, 74, Tile.Basin); // the quench tubs
  b.set(69, 68, Tile.Workbench); // finishing bench
  b.set(73, 68, Tile.ToolRack).set(73, 71, Tile.WeaponRack).set(73, 74, Tile.WeaponRack);
  b.set(60, 78, Tile.Counter).set(61, 78, Tile.Counter).set(62, 78, Tile.Counter);
  b.set(58, 78, Tile.CrateGoods).set(67, 78, Tile.Bench); // commissions wait here
  b.setDetail(63, 79, Detail.Doormat).setDetail(64, 79, Detail.Doormat);
  b.setDetail(60, 72, Detail.Pebbles).setDetail(65, 75, Detail.Pebbles);
  b.fillRect(63, 81, 2, 1, Tile.Path); // doorstep to the lane
  b.sign(60, 81, 'THE GREAT FORGE', ['silver worked, steel earned']);
  // The forge yard: the shift's rest — a true fire circle, racks by
  // the door, the stock stacked in one corner instead of everywhere.
  b.fillRect(76, 84, 18, 9, Tile.Dirt);
  b.set(82, 88, Tile.Campfire);
  b.set(80, 87, Tile.Bench).set(80, 89, Tile.Bench);
  b.set(84, 87, Tile.Bench).set(84, 89, Tile.Bench);
  b.set(77, 85, Tile.WeaponRack).set(79, 85, Tile.ToolRack);
  b.set(91, 85, Tile.Crate).set(92, 90, Tile.Barrel).set(91, 91, Tile.CrateGoods);
  b.setDetail(83, 90, Detail.Pebbles).setDetail(86, 86, Detail.Pebbles);
  // THE ARTISANS' HALL, across the falls bridge: the soft trades in
  // zones — weaving west, carving east, the shop counter south.
  // (Master Weaver Ottilie, Epic 6.)
  b.fillRect(106, 66, 21, 13, Tile.WoodFloor);
  b.outlineRect(106, 66, 21, 13, Tile.WallWood);
  b.set(106, 72, Tile.DoorwayWood).set(106, 73, Tile.DoorwayWood);
  b.set(106, 69, Tile.WallWoodWindow).set(106, 76, Tile.WallWoodWindow);
  b.set(111, 66, Tile.WallWoodWindow).set(120, 66, Tile.WallWoodWindow);
  b.set(111, 78, Tile.WallWoodWindow).set(120, 78, Tile.WallWoodWindow);
  b.set(109, 68, Tile.Loom).set(109, 71, Tile.Loom);
  b.set(112, 67, Tile.Crate); // raw wool and cotton
  b.setDetail(110, 74, Detail.RugRound); // the finished-cloth corner
  b.set(117, 68, Tile.CarvingBench).set(121, 68, Tile.Workbench);
  b.set(119, 67, Tile.Crate); // seasoned timber
  b.setDetail(117, 70, Detail.Sawdust).setDetail(120, 70, Detail.Sawdust);
  b.set(113, 76, Tile.Counter).set(114, 76, Tile.Counter).set(115, 76, Tile.Counter);
  b.set(123, 76, Tile.CrateGoods);
  b.set(123, 67, Tile.Cabinet).set(123, 70, Tile.Bookshelf); // patterns and orders
  b.setDetail(107, 72, Detail.Doormat).setDetail(107, 73, Detail.Doormat);
  // THE MESS TERRACE: stone flags between the falls channel and the
  // cookhouse — long tables, bench rows, braziers against the cold.
  // The kitchen door opens straight onto it (the room-intent law).
  b.fillRect(116, 82, 14, 11, Tile.StoneFloor);
  b.set(119, 85, Tile.Table).set(120, 85, Tile.Table).set(121, 85, Tile.Table);
  b.set(119, 84, Tile.Bench).set(120, 84, Tile.Bench).set(121, 84, Tile.Bench);
  b.set(119, 86, Tile.Bench).set(120, 86, Tile.Bench).set(121, 86, Tile.Bench);
  b.set(123, 89, Tile.Table).set(124, 89, Tile.Table).set(125, 89, Tile.Table);
  b.set(123, 88, Tile.Bench).set(124, 88, Tile.Bench).set(125, 88, Tile.Bench);
  b.set(123, 90, Tile.Bench).set(124, 90, Tile.Bench).set(125, 90, Tile.Bench);
  b.set(117, 83, Tile.Brazier).set(128, 91, Tile.Brazier);
  b.set(116, 88, Tile.Bench); // the channel overlook
  b.set(128, 83, Tile.Barrel);
  // THE COOKHOUSE feeds the terrace from its east side. Hearth pair
  // north, prep line beside them, pantry south-east, serving counter
  // just inside the door.
  b.fillRect(130, 82, 14, 11, Tile.WoodFloor);
  b.outlineRect(130, 82, 14, 11, Tile.WallWood);
  b.set(130, 86, Tile.DoorwayWood);
  b.set(130, 89, Tile.WallWoodWindow).set(134, 82, Tile.WallWoodWindow);
  b.set(139, 82, Tile.WallWoodWindow).set(143, 86, Tile.WallWoodWindow);
  b.set(135, 92, Tile.WallWoodWindow).set(140, 92, Tile.WallWoodWindow);
  b.set(132, 83, Tile.Hearth).set(135, 83, Tile.Hearth);
  b.set(138, 83, Tile.Counter).set(139, 83, Tile.Counter); // the prep line
  b.set(141, 83, Tile.Basin);
  b.set(132, 86, Tile.Counter).set(132, 87, Tile.Counter); // the serving pass
  b.set(141, 90, Tile.CrateGoods).set(142, 88, Tile.Barrel).set(140, 91, Tile.Crate);
  b.set(137, 89, Tile.Table).set(136, 89, Tile.Chair);
  b.setDetail(131, 86, Detail.Doormat);
  // THE DISPENSARY and its work pad. (Herbalist Wyn, Epic 6.)
  b.fillRect(136, 66, 12, 10, Tile.WoodFloor);
  b.outlineRect(136, 66, 12, 10, Tile.WallWood);
  b.set(136, 70, Tile.DoorwayWood);
  b.set(136, 74, Tile.WallWoodWindow).set(141, 66, Tile.WallWoodWindow);
  b.set(147, 70, Tile.WallWoodWindow).set(141, 75, Tile.WallWoodWindow);
  b.set(139, 68, Tile.Alembic);
  b.set(145, 67, Tile.Bookshelf).set(137, 67, Tile.Cabinet);
  b.set(146, 69, Tile.Bed); // Wyn sleeps over the shop
  b.set(140, 72, Tile.Counter).set(141, 72, Tile.Counter);
  b.set(145, 73, Tile.Table).set(144, 73, Tile.Chair);
  b.setDetail(137, 70, Detail.Doormat).setDetail(139, 71, Detail.RugRound);
  b.set(133, 69, Tile.LampPost);
  // The tanning pad hangs off the dispensary's south wall, downwind.
  b.fillRect(138, 76, 4, 4, Tile.Dirt);
  b.set(139, 77, Tile.TanningRack).set(141, 78, Tile.Barrel);
  b.setDetail(140, 79, Detail.Pebbles);
  // THE GREENSTAIR: the east arm's terraced gardens — the mountain
  // feeds itself. The herb fence fits its rows now; the field pads
  // carry three full furrows each.
  b.outlineRect(151, 66, 13, 11, Tile.Fence);
  b.set(151, 71, Tile.Grass); // gate, west, on its own lane spur
  b.set(158, 67, Tile.Basin).set(152, 67, Tile.Crate);
  for (let x = 153; x <= 161; x += 1) {
    b.set(x, 68, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 71, x % 2 === 0 ? Tile.Tilled : Tile.MoonbellMid);
    b.set(x, 74, x % 2 === 0 ? Tile.CarrotRipe : Tile.Tilled);
  }
  b.set(153, 75, Tile.BerryBush).set(160, 75, Tile.BerryBush);
  for (const [gx, gy] of [
    [150, 14], [150, 30], [150, 46],
  ] as const) {
    b.fillRect(gx, gy, 14, 8, Tile.Dirt);
    for (let x = gx + 1; x <= gx + 12; x += 1) {
      b.set(x, gy + 1, x % 2 === 0 ? Tile.WheatMid : Tile.Tilled);
      b.set(x, gy + 3, x % 2 === 0 ? Tile.Tilled : Tile.CottonMid);
      b.set(x, gy + 5, x % 2 === 0 ? Tile.WheatMid : Tile.Tilled);
    }
    b.set(gx + 1, gy + 7, Tile.BerryBush).set(gx + 12, gy + 7, Tile.BerryBush);
  }
  b.set(160, 40, Tile.BerryBush).set(158, 56, Tile.FibrePlant).set(162, 24, Tile.FibrePlant);
  b.set(148, 22, Tile.TreeOak).set(160, 36, Tile.TreeOak).set(148, 54, Tile.TreeOak);
  // THE DEEP GALLERIES: the west arm's old workings climb into the
  // dark in three worked faces, with shoring pairs marching the
  // path and the braziers the miners keep fed out of respect.
  b.fillRect(10, 8, 18, 54, Tile.Dirt);
  // The north face — the vein the foreman won't discuss.
  b.set(14, 10, Tile.RockMithril);
  b.set(12, 12, Tile.RockSilver).set(17, 13, Tile.RockSilver);
  b.set(11, 16, Tile.RockCoal);
  b.set(24, 12, Tile.CaveRubble).set(25, 13, Tile.CaveRubble);
  // The mid face.
  b.set(12, 34, Tile.RockSilver).set(15, 32, Tile.RockIron).set(13, 38, Tile.RockCoal);
  b.set(11, 44, Tile.CaveRubble).set(12, 45, Tile.CaveRubble);
  // The south face, adamant at the very bottom of the climb.
  b.set(20, 46, Tile.RockSilver).set(22, 52, Tile.RockIron);
  b.set(10, 55, Tile.RockAdamant);
  // Shoring pairs and the lit path.
  b.set(13, 20, Tile.PillarStone).set(17, 20, Tile.PillarStone);
  b.set(12, 36, Tile.PillarStone).set(16, 36, Tile.PillarStone);
  b.set(16, 48, Tile.PillarStone).set(20, 48, Tile.PillarStone);
  b.set(16, 18, Tile.Brazier).set(14, 28, Tile.Brazier);
  b.set(16, 40, Tile.Brazier).set(20, 58, Tile.Brazier);
  b.set(26, 60, Tile.Crate).set(11, 60, Tile.Barrel).set(24, 58, Tile.ToolRack);
  b.setDetail(14, 24, Detail.Pebbles).setDetail(19, 36, Detail.Pebbles);
  b.setDetail(13, 50, Detail.Pebbles).setDetail(22, 16, Detail.Pebbles);
  b.fillRect(10, 8, 3, 2, Tile.Snow);

  // ---------------------------------------------------------------
  // L0 — THE GATEFRONT: the wall, the towers, the pool, the yards.
  // ---------------------------------------------------------------
  // The flanking crags first: the backdrop scatter, then the SCREE
  // RIDGES the wall dies into — the flanks are CLOSED, not lawn.
  for (const [rx, ry, rw, rh] of [
    [10, 98, 22, 24], [140, 98, 24, 24],
  ] as const) {
    for (let y = ry; y < ry + rh; y += 3) {
      for (let x = rx; x < rx + rw; x += 4) {
        const j = (x * 7 + y * 13) % 5;
        if (j === 0) b.set(x, y, Tile.Rock);
        else if (j === 1) b.set(x + 1, y + 1, Tile.Tree);
        else if (j === 2) b.set(x, y + 1, Tile.Stump);
      }
    }
  }
  // The city wall — stone, two courses, tower to tower to crag.
  b.fillRect(36, 112, 40, 2, Tile.WallStone);
  b.fillRect(101, 112, 46, 2, Tile.WallStone);
  // The scree ridges: solid double-row rock where the wall ends,
  // scattering out toward the border. Nobody strolls around this.
  for (let x = 16; x <= 35; x++) {
    b.set(x, 112, Tile.Rock).set(x, 113, Tile.Rock);
    if (x % 4 === 0) b.set(x, 111, Tile.Rock);
    if (x % 5 === 0) b.set(x, 114, Tile.Rock);
  }
  for (let x = 8; x <= 15; x++) {
    if (x % 2 === 0) b.set(x, 112, Tile.Rock);
    else b.set(x, 113, Tile.Rock);
  }
  for (let x = 147; x <= 168; x++) {
    b.set(x, 112, Tile.Rock).set(x, 113, Tile.Rock);
    if (x % 4 === 0) b.set(x, 111, Tile.Rock);
    if (x % 5 === 0) b.set(x, 114, Tile.Rock);
  }
  for (let x = 169; x <= 172; x++) {
    if (x % 2 === 0) b.set(x, 112, Tile.Rock);
    else b.set(x, 113, Tile.Rock);
  }
  b.fillRect(20, 110, 3, 1, Tile.Snow).fillRect(155, 110, 3, 1, Tile.Snow);
  // The GATE TOWERS: true octagons (the diagonal budget's flagship),
  // the wall dying into their flanks. (The Gate Watch, Epic 6.)
  for (const tx of [76, 93] as const) {
    b.fillRect(tx + 1, 108, 6, 6, Tile.StoneFloor);
    for (let x = tx + 2; x <= tx + 5; x++) b.set(x, 107, Tile.WallStone);
    for (let x = tx + 2; x <= tx + 5; x++) b.set(x, 114, Tile.WallStone);
    for (let y = 110; y <= 111; y++) b.set(tx, y, Tile.WallStone);
    for (let y = 110; y <= 111; y++) b.set(tx + 7, y, Tile.WallStone);
    b.set(tx + 1, 108, Tile.WallStoneDiagSE).set(tx, 109, Tile.WallStoneDiagSE);
    b.set(tx + 6, 108, Tile.WallStoneDiagSW).set(tx + 7, 109, Tile.WallStoneDiagSW);
    b.set(tx, 112, Tile.WallStoneDiagNE).set(tx + 1, 113, Tile.WallStoneDiagNE);
    b.set(tx + 7, 112, Tile.WallStoneDiagNW).set(tx + 6, 113, Tile.WallStoneDiagNW);
    b.set(tx + 3, 107, Tile.WallStoneWindow);
    b.set(tx + 3, 114, Tile.DoorwayStone);
    b.set(tx + 2, 109, Tile.WeaponRack).set(tx + 5, 109, Tile.WeaponRack);
    b.set(tx + 2, 112, Tile.Brazier);
    b.set(tx + 4, 111, Tile.Table).set(tx + 5, 111, Tile.Chair);
  }
  // The gate itself: an arch row over the avenue, banners inside.
  for (let x = 84; x <= 92; x++) b.set(x, 112, Tile.ArchStone);
  b.fillRect(84, 113, 9, 2, Tile.StoneFloor);
  b.set(83, 111, Tile.BannerPole).set(93, 111, Tile.BannerPole);
  // THE CARAVANSERAI: the road's last yard, laid out like it works —
  // three rail bays with straw and troughs, the cargo corner, the
  // travellers' fire circle, the farrier's bench.
  b.fillRect(50, 98, 23, 12, Tile.Dirt);
  for (let x = 52; x <= 56; x++) b.set(x, 100, Tile.RailWood);
  for (let x = 58; x <= 62; x++) b.set(x, 100, Tile.RailWood);
  for (let x = 64; x <= 68; x++) b.set(x, 100, Tile.RailWood);
  b.setDetail(53, 101, Detail.Straw).setDetail(55, 101, Detail.Straw);
  b.setDetail(59, 101, Detail.Straw).setDetail(61, 101, Detail.Straw);
  b.setDetail(65, 101, Detail.Straw).setDetail(67, 101, Detail.Straw);
  b.set(54, 102, Tile.Basin).set(60, 102, Tile.Basin).set(66, 102, Tile.Basin);
  b.set(70, 99, Tile.Crate).set(71, 100, Tile.Crate).set(70, 103, Tile.CrateGoods);
  b.set(71, 105, Tile.Barrel);
  b.set(56, 106, Tile.Campfire);
  b.set(54, 106, Tile.Bench).set(58, 106, Tile.Bench).set(56, 108, Tile.Bench);
  b.set(69, 107, Tile.Workbench).set(70, 108, Tile.ToolRack); // the farrier
  b.sign(51, 105, 'THE CARAVANSERAI', ['beasts watered,', 'wheels mended']);
  b.fillRect(73, 103, 11, 2, Tile.Path); // the yard apron to the avenue
  // THE GATEHOUSE: the Waykeepers' desk at the door of the city —
  // duty desk facing the door, bunk for the night watch, mess table.
  b.fillRect(36, 100, 11, 10, Tile.StoneFloor);
  b.outlineRect(36, 100, 11, 10, Tile.WallStone);
  b.set(46, 104, Tile.DoorwayStone).set(46, 105, Tile.DoorwayStone);
  b.set(40, 100, Tile.WallStoneWindow).set(36, 104, Tile.WallStoneWindow);
  b.set(40, 109, Tile.WallStoneWindow);
  b.set(41, 104, Tile.Table).set(42, 104, Tile.Table); // the duty desk
  b.set(41, 103, Tile.Chair).set(42, 103, Tile.Chair);
  b.set(37, 101, Tile.WeaponRack).set(37, 103, Tile.WeaponRack);
  b.set(44, 101, Tile.Cabinet);
  b.set(44, 107, Tile.Bed).set(44, 108, Tile.Bed); // the night-watch bunk
  b.set(40, 107, Tile.Table).set(39, 107, Tile.Chair); // the mess corner
  b.set(37, 107, Tile.Brazier);
  b.setDetail(45, 104, Detail.Doormat).setDetail(45, 105, Detail.Doormat);
  // THE GATE MARKET: two facing stall rows on the pool walk — fish,
  // ore, arrivals — with the lamps at the row ends.
  b.fillRect(118, 102, 20, 9, Tile.StoneFloor);
  b.stamp(MARKET_STALL, 119, 103);
  b.stamp(MARKET_STALL, 126, 103);
  b.stamp(MARKET_STALL, 133, 103);
  b.stamp(MARKET_STALL, 122, 107);
  b.stamp(MARKET_STALL, 129, 107);
  b.set(118, 106, Tile.LampPost).set(137, 106, Tile.LampPost);
  b.set(117, 104, Tile.Bench); // the pool overlook
  // The quay: planks to the Roaring Pool's deep water — a jetty
  // (Tile.Dock) on piles, not a crossing.
  b.set(96, 108, Tile.Dock).set(97, 108, Tile.Dock);
  b.set(96, 109, Tile.Dock).set(97, 109, Tile.Dock);
  b.set(99, 107, Tile.FishingSpot).set(111, 104, Tile.FishingSpot);
  b.set(94, 110, Tile.Crate).set(116, 108, Tile.LampPost);
  // The wall's inside lamp and the pool-walk bench.
  b.set(78, 104, Tile.LampPost).set(98, 111, Tile.Bench);
  b.set(118, 96, Tile.TreeWillow);
  // THE APPROACH — outside the wall the city still owns the road:
  // matched brazier pairs to the border and the sign that has meant
  // "made it" to every traveler who read it. Nothing else — the
  // clutter is inside the walls where it belongs.
  b.fillRect(86, 115, 5, 13, Tile.Path);
  b.set(84, 117, Tile.Brazier).set(92, 117, Tile.Brazier);
  b.set(84, 122, Tile.Brazier).set(92, 122, Tile.Brazier);
  b.sign(93, 119, 'SILVERFALL', ['You made it.', 'Mind the edge.'], Tile.Signpost);

  // ---------------------------------------------------------------
  // Mountain life and the soft edges.
  // ---------------------------------------------------------------
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Tuft, 0.05);
  b.scatterDetail(Detail.Pebbles, 0.02);
  // Pines take the terraces where nobody built.
  const pineAt = (x: number, y: number): void => {
    if (b.get(x, y) === Tile.Grass) b.set(x, y, Tile.Tree);
  };
  for (const [px, py] of [
    [50, 65], [79, 66], [78, 72], [51, 84], [50, 91], [96, 92],
    [130, 64], [146, 62], [146, 80], [120, 80],
    [68, 34], [68, 46], [131, 52], [42, 48], [32, 51],
    [46, 24], [46, 15], [82, 11], [112, 11], [126, 28],
    [24, 64], [10, 64], [28, 78], [147, 10], [166, 12], [166, 30], [166, 50],
  ] as const) {
    pineAt(px, py);
  }
  // The border fringe: the wild's last word before the walls. Only
  // the FLAT ring scatters — terrace ground (and its rims, which the
  // auto-fence owns) stays authored.
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      if (b.levelAt(x, y) !== 0) continue;
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(x - 88) <= 5 && y > 110) continue; // the road breathes
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.3 : edge < 6 ? 0.12 : 0;
      if (density > 0 && fallRng(x, y) < density) {
        b.set(x, y, fallRng(x + 1000, y) < 0.2 ? Tile.Rock : Tile.Tree);
      }
    }
  }

  // ---------------------------------------------------------------
  // THE PEOPLE (Epic 6): the mountain's keepers, every building's
  // comment-promise kept. Placements are each routine's post.
  // ---------------------------------------------------------------
  b.actor('warden_maren', 66.5, 14.3, -Math.PI / 2, 'fall_warden');
  b.actor('bursar_odele', 53.5, 40.5, 0, 'fall_bursar');
  b.actor('enchantress_solvei', 37.5, 55.3, -Math.PI / 2, 'fall_enchantress');
  b.actor('marshal_kestrel', 71.5, 55.3, Math.PI / 2, 'fall_marshal');
  b.actor('forgemistress_balla', 59.5, 70.2, Math.PI, 'fall_forgemistress');
  b.actor('foreman_grettir', 20.5, 79.5, 0, 'fall_foreman');
  b.actor('weaver_ottilie', 109.5, 69.3, Math.PI, 'fall_weaver');
  b.actor('herbalist_wyn', 139.5, 69.3, -Math.PI / 2, 'fall_herbalist');
  b.actor('cook_signy', 133.5, 84.3, -Math.PI / 2, 'fall_cook');
  b.actor('hostler_osa', 60.5, 101.5, -Math.PI / 2, 'fall_hostler');
  b.actor('mason_petra', 39.5, 87.3, -Math.PI / 2, 'fall_mason');
  b.actor('gardener_ivo', 157.5, 71.5, Math.PI / 2, 'fall_gardener');
  b.actor('shrinekeeper_sella', 118.5, 20.5, -Math.PI / 2, 'fall_shrinekeeper');
  // The watch: both gate towers and the gatehouse desk.
  b.actor('silverfall_watch', 79.5, 110.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 96.5, 110.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 41.5, 105.5, 0, 'fall_watch');
  // The markets: galleria stalls above, pool stalls below.
  b.actor('galleria_trader', 110.5, 52.4, Math.PI / 2, 'fall_trader');
  b.actor('galleria_trader', 126.5, 52.4, Math.PI / 2, 'fall_trader');
  b.actor('galleria_trader', 114.5, 57.4, Math.PI / 2, 'fall_trader');
  b.actor('gate_monger', 120.5, 102.4, Math.PI / 2, 'fall_trader');
  b.actor('gate_monger', 130.5, 106.4, Math.PI / 2, 'fall_trader');

  // The crag pasture's rams — the city's only livestock, on purpose.
  b.npcSpawn('ram', 35, 31.5, 3, 3);

  // The hearth of the north: respawn inside the gate, on the avenue.
  b.spawn(88.5, 104.5);
  return b.build();
}

/** Stable per-tile randomness so the city is identical every boot. */
function fallRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
