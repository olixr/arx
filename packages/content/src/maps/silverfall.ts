import { Detail, Tile } from '@devcraft/shared';
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
 * The city is a HAVEN, not a settled hearth (the haven law): its
 * lamp pushes danger back inside the walls while the approach stays
 * tier 4-5 — the walk here is the game, arriving is the reward.
 * Bespoke-architecture and town-plan laws apply throughout: streets
 * first, a diagonal budget (the gate towers' octagons, the bank's
 * shoulders, the High Hall's front corners), and rooms with jobs.
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
  // THE AVENUE — the High Road continued: stone from gate to Hold.
  // ---------------------------------------------------------------
  b.fillRect(84, 96, 9, 16, Tile.StoneFloor); // gatefront stretch
  b.fillRect(84, 64, 9, 31, Tile.StoneFloor); // working stretch
  b.fillRect(84, 32, 9, 31, Tile.StoneFloor); // hall stretch
  b.fillRect(84, 26, 9, 5, Tile.StoneFloor); // hold landing
  // Brazier pairs light each landing — the stair burns, not lamps.
  b.set(83, 94, Tile.Brazier).set(93, 94, Tile.Brazier);
  b.set(83, 62, Tile.Brazier).set(93, 62, Tile.Brazier);
  b.set(83, 30, Tile.Brazier).set(93, 30, Tile.Brazier);

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
  // L1: plunge basin, then the working channel.
  b.fillEllipse(100, 66, 4, 2, Tile.WaterShallow);
  b.fillRect(99, 65, 4, 30, Tile.Water); // to the lip at y94
  b.set(98, 65, Tile.WaterShallow).set(103, 65, Tile.WaterShallow);
  // L0: the ROARING POOL — the whole mountain's water lands here.
  b.fillEllipse(104, 102, 12, 6.5, Tile.WaterShallow);
  b.fillEllipse(104, 102, 10, 5.5, Tile.Water);
  b.fillEllipse(104, 101, 6, 3.5, Tile.WaterDeep);
  // Bridges: the channel is crossed, never forded.
  for (let x = 98; x <= 103; x++) {
    b.set(x, 44, Tile.Bridge).set(x, 45, Tile.Bridge); // court -> guildhall
    b.set(x, 56, Tile.Bridge).set(x, 57, Tile.Bridge); // galleria crossing
    b.set(x, 74, Tile.Bridge).set(x, 75, Tile.Bridge); // forge -> artisans
    b.set(x, 86, Tile.Bridge).set(x, 87, Tile.Bridge); // yard -> cookhouse
  }

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
  // The great hall: twin hearths, the long tables, the moot lectern.
  b.set(54, 14, Tile.Hearth).set(78, 14, Tile.Hearth);
  b.set(66, 14, Tile.Lectern);
  b.setDetail(65, 15, Detail.Rug).setDetail(66, 15, Detail.Rug).setDetail(67, 15, Detail.Rug);
  for (const y of [18, 22]) {
    b.set(58, y, Tile.Table).set(59, y, Tile.Table).set(60, y, Tile.Table);
    b.set(57, y, Tile.Chair).set(61, y, Tile.Chair);
    b.set(70, y, Tile.Table).set(71, y, Tile.Table).set(72, y, Tile.Table);
    b.set(69, y, Tile.Chair).set(73, y, Tile.Chair);
  }
  // The armory wing (west) and the wardens' chambers (east).
  for (let y = 13; y <= 25; y++) b.set(63, y, Tile.WallStone);
  b.set(63, 20, Tile.DoorwayStone);
  b.set(54, 25, Tile.WeaponRack).set(54, 27, Tile.WeaponRack);
  b.set(57, 13, Tile.WeaponRack).set(60, 13, Tile.Cabinet);
  for (let y = 13; y <= 25; y++) b.set(69, y, Tile.WallStone);
  b.set(69, 20, Tile.DoorwayStone);
  b.set(78, 25, Tile.Bed).set(74, 25, Tile.Bed);
  b.set(78, 13, Tile.Bookshelf).set(75, 13, Tile.Cabinet);
  b.setDetail(76, 22, Detail.RugRound);
  // Hall front: banners and the moot bell... the banners at least.
  b.set(62, 30, Tile.BannerPole).set(69, 30, Tile.BannerPole);
  b.setDetail(65, 30, Detail.Doormat).setDetail(66, 30, Detail.Doormat);
  // The SILVER SHRINE: a pillar ring over the mere's east shore —
  // the road-faith's mother circle. (Keeper arrives in Epic 6.)
  b.set(116, 14, Tile.PillarStone).set(122, 14, Tile.PillarStone);
  b.set(114, 19, Tile.PillarStone).set(124, 19, Tile.PillarStone);
  b.set(116, 24, Tile.PillarStone).set(122, 24, Tile.PillarStone);
  b.fillRect(118, 18, 3, 3, Tile.StoneFloor);
  b.set(119, 19, Tile.Brazier);
  b.set(117, 21, Tile.Bench).set(121, 21, Tile.Bench);
  b.set(119, 16, Tile.FlowerBox);
  // Mirrormere dressing: the willows, the still-water fishing.
  b.set(88, 12, Tile.TreeWillow).set(110, 13, Tile.TreeWillow).set(84, 23, Tile.TreeWillow);
  b.set(90, 23, Tile.FishingSpot).set(106, 15, Tile.FishingSpot);
  // Snow holds the high ground all year.
  b.fillRect(50, 26, 3, 2, Tile.Snow).fillRect(124, 12, 3, 2, Tile.Snow);
  b.fillRect(108, 27, 4, 2, Tile.Snow);

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
  // The GRAND COURT: the plaza at the stair crown, the silver
  // fountain at its heart, the city's meeting ground.
  b.fillRect(70, 32, 28, 17, Tile.StoneFloor);
  b.set(78, 39, Tile.WallStone).set(79, 39, Tile.WallStone); // the fountain
  b.set(78, 40, Tile.WallStone).set(79, 40, Tile.WallStone);
  b.set(76, 38, Tile.FlowerBox).set(81, 38, Tile.FlowerBox);
  b.set(76, 42, Tile.Bench).set(81, 42, Tile.Bench);
  b.set(72, 33, Tile.BannerPole).set(95, 33, Tile.BannerPole);
  b.set(72, 47, Tile.LampPost).set(95, 47, Tile.LampPost);
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
  b.set(47, 47, Tile.CrateGoods).set(45, 47, Tile.Cabinet);
  // The banking floor: teller line, ledger wall, the lobby rugs.
  for (let y = 36; y <= 44; y++) b.set(54, y, Tile.Counter);
  b.set(51, 34, Tile.Bookshelf).set(52, 34, Tile.Bookshelf);
  b.set(51, 46, Tile.Table).set(52, 46, Tile.Chair);
  b.set(57, 36, Tile.BankChest).set(57, 44, Tile.BankChest).set(62, 34, Tile.BankChest);
  b.set(60, 46, Tile.Bench).set(61, 46, Tile.Bench);
  b.setDetail(59, 40, Detail.Rug).setDetail(60, 40, Detail.Rug);
  b.setDetail(59, 41, Detail.Rug).setDetail(60, 41, Detail.Rug);
  b.setDetail(62, 40, Detail.Doormat).setDetail(62, 41, Detail.Doormat);
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
  // The charter floor: the great table, the trades' library, the
  // seal counter where guild papers are stamped.
  b.set(112, 38, Tile.Table).set(113, 38, Tile.Table).set(114, 38, Tile.Table);
  b.set(111, 38, Tile.Chair).set(115, 38, Tile.Chair).set(113, 40, Tile.Chair);
  for (let x = 118; x <= 124; x++) b.set(x, 35, Tile.Bookshelf);
  b.set(118, 42, Tile.Counter).set(119, 42, Tile.Counter).set(120, 42, Tile.Counter);
  b.set(125, 36, Tile.Cabinet).set(125, 47, Tile.Cabinet);
  b.set(109, 35, Tile.BannerPole);
  b.set(110, 47, Tile.Table).set(111, 47, Tile.Chair);
  b.setDetail(112, 41, Detail.Rug).setDetail(113, 41, Detail.Rug);
  b.setDetail(107, 41, Detail.Doormat).setDetail(107, 42, Detail.Doormat);
  // THE ARCANUM: the enchanters' tower on the southwest — runes
  // burn brighter this high. (Enchantress Solvei's post, Epic 6.)
  b.fillRect(34, 52, 13, 10, Tile.StoneFloor);
  b.outlineRect(34, 52, 13, 10, Tile.WallStone);
  b.set(46, 56, Tile.DoorwayStone);
  b.set(39, 52, Tile.WallStoneWindow).set(34, 57, Tile.WallStoneWindow);
  b.set(39, 61, Tile.WallStoneWindow);
  b.set(37, 55, Tile.EnchantingTable);
  b.set(35, 53, Tile.Bookshelf).set(36, 53, Tile.Bookshelf).set(44, 53, Tile.Bookshelf);
  b.set(41, 58, Tile.Table).set(42, 58, Tile.Chair);
  b.set(35, 60, Tile.Brazier).set(44, 60, Tile.Brazier);
  b.setDetail(38, 57, Detail.RugRound).setDetail(45, 56, Detail.Doormat);
  b.set(48, 58, Tile.LampPost);
  // THE WAYKEEPERS' CHAPTER HOUSE: the order that walks every mile
  // of the roads answers to this room. (Marshal Kestrel, Epic 6.)
  b.fillRect(66, 52, 15, 10, Tile.StoneFloor);
  b.outlineRect(66, 52, 15, 10, Tile.WallStone);
  b.set(72, 52, Tile.DoorwayStone).set(73, 52, Tile.DoorwayStone);
  b.set(69, 52, Tile.WallStoneWindow).set(77, 52, Tile.WallStoneWindow);
  b.set(66, 57, Tile.WallStoneWindow).set(80, 57, Tile.WallStoneWindow);
  b.set(67, 53, Tile.WeaponRack).set(67, 55, Tile.WeaponRack).set(67, 57, Tile.WeaponRack);
  b.set(71, 56, Tile.Table).set(72, 56, Tile.Table);
  b.set(70, 56, Tile.Chair).set(73, 56, Tile.Chair);
  b.set(76, 60, Tile.Bed).set(79, 60, Tile.Bed);
  b.set(79, 53, Tile.Cabinet);
  b.set(69, 60, Tile.Brazier);
  b.setDetail(72, 53, Detail.Doormat).setDetail(73, 53, Detail.Doormat);
  // THE GALLERIA: the upper market — stalls under the east cliffs,
  // where everything the mine and the road bring in changes hands.
  b.fillRect(106, 53, 34, 8, Tile.StoneFloor);
  b.stamp(MARKET_STALL, 108, 53);
  b.stamp(MARKET_STALL, 116, 57);
  b.stamp(MARKET_STALL, 124, 53);
  b.stamp(MARKET_STALL, 132, 57);
  b.set(113, 55, Tile.LampPost).set(129, 55, Tile.LampPost);
  b.set(138, 54, Tile.Bench).set(138, 59, Tile.Bench);
  b.set(112, 60, Tile.Barrel).set(128, 60, Tile.Crate);
  // THE UNDERCROFT MOUTH — the sealed way down. The Masons' Guild
  // closed it a generation ago and the seal has its own warden's
  // mark. It opens in Epic 5, and everyone in the city knows it.
  b.fillRect(34, 14, 9, 5, Tile.CaveWall);
  b.set(38, 18, Tile.ArchStone);
  b.set(38, 17, Tile.CaveRubble); // the fill behind the arch
  b.fillRect(36, 19, 5, 2, Tile.StoneFloor);
  b.set(36, 19, Tile.Brazier).set(40, 19, Tile.Brazier);
  b.set(38, 21, Tile.HangingSign); // "THE UNDERCROFT — sealed by the Masons' Guild."
  b.set(34, 21, Tile.CaveRubble).set(42, 20, Tile.CaveRubble);
  // THE CRAG PASTURE: the west-arm shelf where the city's rams keep
  // the grass down and their own opinions up.
  b.outlineRect(32, 28, 13, 13, Tile.Fence);
  b.set(44, 34, Tile.Grass); // the gate, east
  b.set(34, 30, Tile.Basin);
  b.setDetail(36, 33, Detail.Straw).setDetail(41, 37, Detail.Straw);
  b.fillRect(33, 42, 3, 2, Tile.Snow);
  // The east promenade: lamps and yews along the hall-terrace walk.
  b.set(132, 62, Tile.TreeYew).set(141, 58, Tile.TreeYew).set(141, 40, Tile.TreeYew);
  b.set(134, 36, Tile.LampPost).set(141, 48, Tile.Bench);
  b.set(60, 51, Tile.TreeYew).set(50, 56, Tile.TreeYew);

  // ---------------------------------------------------------------
  // L1 — THE WORKING TERRACE: silver first, everything else after.
  // ---------------------------------------------------------------
  // THE MINE YARD: the open workings under the west cliffs — the
  // veins the city was founded on. (Foreman Grettir, Epic 6.)
  b.fillRect(10, 66, 36, 27, Tile.Dirt);
  b.set(13, 70, Tile.RockSilver).set(19, 75, Tile.RockSilver).set(13, 82, Tile.RockSilver);
  b.set(23, 88, Tile.RockSilver).set(27, 70, Tile.RockSilver);
  b.set(17, 79, Tile.RockIron).set(25, 84, Tile.RockIron);
  b.set(11, 75, Tile.RockCoal).set(21, 80, Tile.RockCoal);
  b.set(15, 90, Tile.RockGold);
  b.setDetail(15, 72, Detail.Pebbles).setDetail(22, 77, Detail.Pebbles);
  b.setDetail(18, 86, Detail.Pebbles).setDetail(26, 74, Detail.Pebbles);
  b.set(29, 68, Tile.CaveRubble).set(12, 87, Tile.CaveRubble);
  b.set(31, 90, Tile.Crate).set(33, 90, Tile.Crate).set(35, 91, Tile.Barrel);
  // THE SMELTER HALL: three furnaces running shifts on the seam.
  b.fillRect(32, 66, 17, 13, Tile.StoneFloor);
  b.outlineRect(32, 66, 17, 13, Tile.WallStone);
  b.set(39, 78, Tile.DoorwayStoneWide).set(40, 78, Tile.DoorwayStoneWide);
  b.set(35, 78, Tile.WallStoneWindow).set(44, 78, Tile.WallStoneWindow);
  b.set(32, 71, Tile.WallStoneWindow).set(48, 71, Tile.WallStoneWindow);
  b.set(34, 68, Tile.Furnace).set(38, 68, Tile.Furnace).set(42, 68, Tile.Furnace);
  b.set(46, 68, Tile.Basin);
  b.set(34, 75, Tile.Counter).set(35, 75, Tile.Counter).set(36, 75, Tile.Counter);
  b.set(46, 74, Tile.CrateGoods).set(47, 76, Tile.CrateGoods);
  b.setDetail(39, 79, Detail.Doormat).setDetail(40, 79, Detail.Doormat);
  b.setDetail(40, 71, Detail.Pebbles);
  b.set(37, 81, Tile.HangingSign); // "THE SMELTER — pour days: all of them."
  // THE MASONS' YARD: the city maintains itself in stone.
  b.fillRect(32, 84, 15, 9, Tile.Dirt);
  b.set(35, 86, Tile.Workbench).set(41, 86, Tile.Workbench);
  b.set(34, 90, Tile.PillarStone).set(44, 90, Tile.PillarStone); // stock, not structure
  b.set(38, 90, Tile.Crate).set(45, 87, Tile.CaveRubble);
  b.setDetail(37, 88, Detail.Pebbles).setDetail(43, 91, Detail.Pebbles);
  // THE GREAT FORGE: the mountain's anvils. (Forgemistress Balla.)
  b.fillRect(54, 66, 21, 15, Tile.StoneFloor);
  b.outlineRect(54, 66, 21, 15, Tile.WallStone);
  b.set(63, 80, Tile.DoorwayStoneWide).set(64, 80, Tile.DoorwayStoneWide);
  b.set(58, 80, Tile.WallStoneWindow).set(70, 80, Tile.WallStoneWindow);
  b.set(54, 71, Tile.WallStoneWindow).set(54, 76, Tile.WallStoneWindow);
  b.set(74, 71, Tile.WallStoneWindow).set(59, 66, Tile.WallStoneWindow).set(69, 66, Tile.WallStoneWindow);
  b.set(56, 69, Tile.Furnace).set(56, 74, Tile.Furnace);
  b.set(61, 70, Tile.Anvil).set(65, 70, Tile.Anvil).set(61, 75, Tile.Anvil);
  b.set(70, 68, Tile.Basin);
  b.set(73, 70, Tile.ToolRack).set(73, 74, Tile.WeaponRack);
  b.set(66, 78, Tile.Counter).set(67, 78, Tile.Counter).set(68, 78, Tile.Counter);
  b.set(58, 78, Tile.CrateGoods);
  b.setDetail(63, 79, Detail.Doormat).setDetail(64, 79, Detail.Doormat);
  b.setDetail(63, 72, Detail.Pebbles);
  b.set(60, 82, Tile.HangingSign); // "THE GREAT FORGE — silver worked, steel earned."
  // The forge yard: the shift's rest between pours.
  b.fillRect(76, 84, 18, 9, Tile.Dirt);
  b.set(78, 86, Tile.WeaponRack).set(78, 90, Tile.ToolRack);
  b.set(82, 88, Tile.Campfire);
  b.set(85, 86, Tile.Bench).set(85, 90, Tile.Bench);
  b.set(91, 85, Tile.Crate).set(92, 90, Tile.Barrel);
  b.setDetail(83, 90, Detail.Pebbles);
  // THE ARTISANS' HALL, across the falls bridge: the soft trades in
  // the water-light. (Master Weaver Ottilie, Epic 6.)
  b.fillRect(106, 66, 21, 13, Tile.WoodFloor);
  b.outlineRect(106, 66, 21, 13, Tile.WallWood);
  b.set(106, 72, Tile.DoorwayWood).set(106, 73, Tile.DoorwayWood);
  b.set(106, 69, Tile.WallWoodWindow).set(106, 76, Tile.WallWoodWindow);
  b.set(111, 66, Tile.WallWoodWindow).set(120, 66, Tile.WallWoodWindow);
  b.set(111, 78, Tile.WallWoodWindow).set(120, 78, Tile.WallWoodWindow);
  b.set(109, 68, Tile.Loom).set(109, 72, Tile.Loom);
  b.set(114, 68, Tile.CarvingBench);
  b.set(119, 68, Tile.Workbench);
  b.set(124, 68, Tile.Cabinet).set(124, 71, Tile.Bookshelf);
  b.set(114, 76, Tile.Counter).set(115, 76, Tile.Counter).set(116, 76, Tile.Counter);
  b.set(124, 76, Tile.CrateGoods);
  b.setDetail(107, 72, Detail.Doormat).setDetail(107, 73, Detail.Doormat);
  b.setDetail(112, 70, Detail.Sawdust).setDetail(117, 74, Detail.Sawdust);
  // The tanning terrace, downwind on the east.
  b.fillRect(129, 68, 3, 4, Tile.Dirt);
  b.set(130, 69, Tile.TanningRack);
  b.set(130, 71, Tile.Barrel);
  // THE COOKHOUSE and the workers' mess: the terrace eats together.
  b.fillRect(106, 82, 14, 11, Tile.WoodFloor);
  b.outlineRect(106, 82, 14, 11, Tile.WallWood);
  b.set(112, 82, Tile.DoorwayWood).set(113, 82, Tile.DoorwayWood);
  b.set(109, 82, Tile.WallWoodWindow).set(117, 82, Tile.WallWoodWindow);
  b.set(106, 87, Tile.WallWoodWindow).set(119, 87, Tile.WallWoodWindow);
  b.set(108, 84, Tile.Hearth).set(108, 89, Tile.Hearth);
  b.set(112, 91, Tile.Counter).set(113, 91, Tile.Counter).set(114, 91, Tile.Counter);
  b.set(117, 84, Tile.Basin);
  b.set(117, 90, Tile.CrateGoods).set(118, 91, Tile.Barrel);
  b.setDetail(112, 83, Detail.Doormat).setDetail(113, 83, Detail.Doormat);
  b.fillRect(122, 84, 12, 9, Tile.Dirt); // the mess yard
  b.set(124, 86, Tile.Table).set(125, 86, Tile.Table);
  b.set(123, 86, Tile.Chair).set(126, 86, Tile.Chair);
  b.set(129, 89, Tile.Table).set(130, 89, Tile.Table);
  b.set(128, 89, Tile.Chair).set(131, 89, Tile.Chair);
  b.set(125, 91, Tile.Bench).set(132, 85, Tile.Bench);
  b.set(133, 91, Tile.Barrel);
  // THE DISPENSARY and its cliff-garden. (Herbalist Wyn, Epic 6.)
  b.fillRect(136, 66, 12, 10, Tile.WoodFloor);
  b.outlineRect(136, 66, 12, 10, Tile.WallWood);
  b.set(136, 70, Tile.DoorwayWood);
  b.set(136, 74, Tile.WallWoodWindow).set(141, 66, Tile.WallWoodWindow);
  b.set(147, 70, Tile.WallWoodWindow).set(141, 75, Tile.WallWoodWindow);
  b.set(139, 68, Tile.Alembic);
  b.set(145, 67, Tile.Bookshelf).set(137, 67, Tile.Cabinet);
  b.set(140, 72, Tile.Counter).set(141, 72, Tile.Counter);
  b.set(145, 73, Tile.Table).set(144, 73, Tile.Chair);
  b.setDetail(137, 70, Detail.Doormat).setDetail(139, 71, Detail.RugRound);
  b.set(134, 68, Tile.LampPost);
  // THE GREENSTAIR: the east arm's terraced gardens — the mountain
  // feeds itself. Rows ride the arm all the way up.
  b.outlineRect(150, 66, 15, 11, Tile.Fence);
  b.set(150, 71, Tile.Grass); // gate, west
  for (let x = 152; x <= 162; x += 1) {
    b.set(x, 68, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 71, x % 2 === 0 ? Tile.Tilled : Tile.MoonbellMid);
    b.set(x, 74, x % 2 === 0 ? Tile.CarrotRipe : Tile.Tilled);
  }
  for (const [gx, gy] of [
    [150, 14], [150, 30], [150, 46],
  ] as const) {
    b.fillRect(gx, gy, 14, 8, Tile.Dirt);
    for (let x = gx + 1; x <= gx + 12; x += 1) {
      b.set(x, gy + 2, x % 2 === 0 ? Tile.WheatMid : Tile.Tilled);
      b.set(x, gy + 5, x % 2 === 0 ? Tile.Tilled : Tile.CottonMid);
    }
  }
  b.set(154, 24, Tile.BerryBush).set(160, 40, Tile.BerryBush).set(152, 56, Tile.BerryBush);
  b.set(158, 56, Tile.FibrePlant).set(162, 24, Tile.FibrePlant);
  b.set(148, 22, Tile.TreeOak).set(160, 36, Tile.TreeOak).set(148, 54, Tile.TreeOak);
  // THE DEEP GALLERIES: the west arm's old workings climb into the
  // dark — richer veins, thinner air, and the braziers the miners
  // keep fed out of respect for things they don't discuss.
  b.fillRect(10, 8, 18, 54, Tile.Dirt);
  b.set(12, 14, Tile.RockSilver).set(18, 22, Tile.RockSilver);
  b.set(12, 34, Tile.RockSilver).set(20, 46, Tile.RockSilver);
  b.set(14, 10, Tile.RockMithril); // the vein the foreman won't discuss
  b.set(10, 55, Tile.RockAdamant);
  b.set(16, 28, Tile.RockIron).set(22, 52, Tile.RockIron);
  b.set(10, 20, Tile.RockCoal).set(24, 40, Tile.RockCoal);
  b.set(16, 18, Tile.Brazier).set(16, 40, Tile.Brazier).set(20, 58, Tile.Brazier);
  b.set(24, 12, Tile.CaveRubble).set(11, 44, Tile.CaveRubble).set(25, 30, Tile.CaveRubble);
  b.setDetail(14, 24, Detail.Pebbles).setDetail(19, 36, Detail.Pebbles);
  b.setDetail(13, 50, Detail.Pebbles).setDetail(22, 16, Detail.Pebbles);
  b.set(26, 60, Tile.Crate).set(11, 60, Tile.Barrel);
  b.fillRect(10, 8, 3, 2, Tile.Snow);

  // ---------------------------------------------------------------
  // L0 — THE GATEFRONT: the wall, the towers, the pool, the yard.
  // ---------------------------------------------------------------
  // The city wall — stone, two courses thick, tower to tower.
  b.fillRect(44, 112, 32, 2, Tile.WallStone);
  b.fillRect(101, 112, 36, 2, Tile.WallStone);
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
  // THE CARAVANSERAI: rails, water, fire — the road's last yard.
  b.fillRect(50, 98, 23, 12, Tile.Dirt);
  for (let x = 52; x <= 58; x++) b.set(x, 100, Tile.RailWood);
  for (let x = 62; x <= 68; x++) b.set(x, 100, Tile.RailWood);
  b.set(53, 102, Tile.Basin).set(66, 102, Tile.Basin);
  b.set(57, 105, Tile.Campfire);
  b.set(54, 107, Tile.Bench).set(60, 107, Tile.Bench).set(66, 107, Tile.Bench);
  b.set(70, 99, Tile.Crate).set(71, 101, Tile.Barrel).set(70, 108, Tile.CrateGoods);
  b.setDetail(55, 101, Detail.Straw).setDetail(64, 101, Detail.Straw);
  b.setDetail(58, 106, Detail.Straw);
  b.set(51, 111, Tile.HangingSign); // "THE CARAVANSERAI — beasts watered, wheels mended."
  // THE GATEHOUSE: the Waykeepers' desk at the door of the city.
  b.fillRect(36, 100, 11, 10, Tile.StoneFloor);
  b.outlineRect(36, 100, 11, 10, Tile.WallStone);
  b.set(46, 104, Tile.DoorwayStone).set(46, 105, Tile.DoorwayStone);
  b.set(40, 100, Tile.WallStoneWindow).set(36, 104, Tile.WallStoneWindow);
  b.set(40, 109, Tile.WallStoneWindow);
  b.set(37, 101, Tile.WeaponRack).set(37, 103, Tile.WeaponRack);
  b.set(41, 104, Tile.Table).set(42, 104, Tile.Chair).set(41, 106, Tile.Chair);
  b.set(44, 101, Tile.Cabinet);
  b.set(37, 107, Tile.Brazier);
  b.setDetail(45, 104, Detail.Doormat).setDetail(45, 105, Detail.Doormat);
  // THE GATE MARKET: the pool-side stalls — fish, ore, arrivals.
  b.fillRect(118, 102, 20, 9, Tile.StoneFloor);
  b.stamp(MARKET_STALL, 119, 103);
  b.stamp(MARKET_STALL, 127, 106);
  b.stamp(MARKET_STALL, 133, 102);
  b.set(124, 109, Tile.LampPost).set(136, 109, Tile.Bench);
  b.set(118, 109, Tile.Barrel);
  // The quay: planks to the Roaring Pool's deep water.
  b.set(96, 108, Tile.Bridge).set(97, 108, Tile.Bridge);
  b.set(96, 109, Tile.Bridge).set(97, 109, Tile.Bridge);
  b.set(99, 107, Tile.FishingSpot).set(111, 104, Tile.FishingSpot);
  b.set(116, 108, Tile.LampPost);
  // The wall's inside lamps and the pool-walk benches.
  b.set(78, 104, Tile.LampPost).set(98, 111, Tile.Bench);
  b.set(118, 96, Tile.TreeWillow);
  // THE APPROACH — outside the wall the city still owns the road:
  // brazier pairs to the border, the last lamps of the climb, and
  // the sign that has meant "made it" to every traveler who read it.
  b.fillRect(86, 115, 5, 13, Tile.Path);
  b.set(84, 117, Tile.Brazier).set(92, 117, Tile.Brazier);
  b.set(84, 122, Tile.Brazier).set(92, 122, Tile.Brazier);
  b.set(93, 119, Tile.HangingSign); // "SILVERFALL. You made it. Mind the edge."
  b.set(80, 115, Tile.LampPost).set(98, 115, Tile.LampPost);
  // The flanking crags: the massif closes around the gatefront.
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
  b.fillRect(12, 100, 3, 2, Tile.Snow).fillRect(152, 102, 3, 2, Tile.Snow);

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
    [130, 64], [134, 78], [146, 62], [146, 80],
    [68, 34], [68, 46], [100, 51], [131, 52], [42, 48], [32, 51],
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

  // The crag pasture's rams — the city's only livestock, on purpose.
  b.npcSpawn('ram', 38, 34.5, 3, 3);

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
