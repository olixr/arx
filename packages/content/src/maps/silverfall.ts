import { Detail, Tile } from '@arx/shared';
import { SILVERFALL_RECT } from '../geography.js';
import { MARKET_STALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * SILVERFALL — the royal capital of the Dawnlands, cut terrace by
 * terrace into the living rock of the Silverspine. The High Road
 * climbs five hundred tiles of frontier to reach a gate in the
 * massif's mouth, and behind that gate the city rises in FOUR
 * TERRACES — and the climb is the social ladder:
 *
 *   L0  THE GATEFRONT — the garrison curtain (tiles 139-145: a true
 *       siege rampart, drum towers, chamfered gate bastions, and the
 *       Silver Gate's carved arch), the caravanserai, the gate
 *       market, and the Roaring Pool where the falls land.
 *       Travelers, wagons, and the watch's first questions.
 *   L1  THE TRADES TERRACE — split by the falls channel into two
 *       districts: THE EMBERWAY west (mine yard, smelter, assay
 *       house, the Great Forge, the masons) where the city earns its
 *       name in silver, and THE TIMBERWAY east (saw yard, carpenters'
 *       hall, cooperage, fletcher) where the mountain's pine becomes
 *       everything else — with the cookhouse, mess terrace,
 *       dispensary, and Greenstair gardens feeding both shifts.
 *   L2  THE SILVER COURT & LANTERN ROW — the civic heart (Grand
 *       Court, Bank, Guildhall, Arcanum, Waykeepers' chapter house)
 *       and the shopping street: the Silver Setting, the Cloth Hall,
 *       Inks & Charts, and the Silver Flagon inn behind two rows of
 *       lamps. And tucked into the crag shadow behind the bank, where
 *       no lamp burns and no sign points: THE ROOKERY — the rogues'
 *       quarter, older than the castle, holding the Undercroft mouth.
 *   L3  THE CROWN — Castle Silverfall, seat of the Silver Line
 *       (King Halvard III and Queen Eira), the Mirrormere whose
 *       overflow IS the falls, and the Silver Shrine.
 *
 * TERRACE LAW: the terraces are NESTED raises (L2 inside L1, L3
 * inside L2), so every rim is exactly ONE level and the auto-fence
 * reads clean everywhere; the north edges step down band by band,
 * leaving high LEDGE WALKS behind the upper terraces — the y7-9
 * ledge behind the castle is the Rookery's back way. Water NEVER
 * touches a rim — each channel stops at the lip and resumes in a
 * plunge basin below (the waterfall curtains hang themselves; the
 * foot-water law is asserted by silverfall.test.ts). Stairs face
 * south; the Silver Stair — three grand nine-wide flights on one
 * axis — carries the High Road from the gate to the Crown.
 *
 * THE FORTIFICATION LADDER (the garrison epic in a capital): the
 * outer curtain closes the massif's mouth at L0; every terrace above
 * is walled by the mountain itself (nested cliffs, three stairs);
 * the COURT GATE arches the avenue stair where it crowns L2 — wings
 * dying into the rim, side stairs left open so no shut leaf can ever
 * strand a resident's errand (garrison gates share the fence-gate
 * debt: NPCs do not open them). Gates are authored OPEN and never
 * auto-close untouched — shutting them is the players' war-measure.
 *
 * TOWN-PLAN LAWS (Amberford's laws, kept):
 * - STREETS FIRST. Every working door fronts a street: the avenue,
 *   the Emberway lane, the Timberway spine and east lane, the court
 *   walks, Lantern Row. Buildings do not float on grass islands.
 * - NOTHING OVERLAPS. Three clear tiles between structures; snow
 *   never eats a wall; the city wall dies into solid scree.
 * - ROOMS HAVE JOBS. One purpose per room and the furniture proves
 *   it: the throne hall feasts, the armory racks steel, the assay
 *   house weighs the Crown's tithe, the fence's counter faces the
 *   den door.
 * - THE ROOKERY IS HIDDEN. No lamp, no sign, no paved approach: one
 *   narrow alley beside the bank's west wall and the high ledge
 *   behind the castle. The Crown tolerates what it can watch.
 *
 * The city is a HAVEN, not a settled hearth (the haven law): its
 * lamp pushes danger back inside the walls while the approach stays
 * tier 4-5 — the walk here is the game, arriving is the reward.
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
  // THE AVENUE — the High Road continued: stone from gate to Crown,
  // lamped at a marching rhythm so the climb reads as one street.
  // ---------------------------------------------------------------
  b.fillRect(84, 96, 9, 16, Tile.StoneFloor); // gatefront stretch
  b.fillRect(84, 64, 9, 31, Tile.StoneFloor); // trades stretch
  b.fillRect(84, 32, 9, 31, Tile.StoneFloor); // court stretch
  b.fillRect(84, 26, 9, 5, Tile.StoneFloor); // crown landing
  // Brazier pairs light each landing — the stair burns, not lamps.
  b.set(83, 94, Tile.Brazier).set(93, 94, Tile.Brazier);
  // (The middle landing's pair stands at y61 — the Court Gate owns
  // the y62 line there; see the L2 section.)
  b.set(83, 61, Tile.Brazier).set(98, 61, Tile.Brazier);
  b.set(83, 30, Tile.Brazier).set(93, 30, Tile.Brazier);
  // Lamp pairs between the landings pace out the long stretches.
  b.set(83, 40, Tile.LampPost).set(93, 40, Tile.LampPost);
  b.set(83, 52, Tile.LampPost).set(93, 52, Tile.LampPost);
  b.set(83, 70, Tile.LampPost).set(93, 70, Tile.LampPost);
  b.set(83, 80, Tile.LampPost).set(93, 80, Tile.LampPost);

  // ---------------------------------------------------------------
  // THE WATER — Mirrormere overflows south, terrace by terrace, and
  // every lip is a falls. Channels stop shy of every rim.
  // ---------------------------------------------------------------
  // L3: the Mirrormere — still, deep, and the city's whole reason.
  b.fillEllipse(98, 18, 13, 5.5, Tile.WaterShallow);
  b.fillEllipse(98, 18, 11, 4.5, Tile.Water);
  b.fillEllipse(98, 18, 7, 3, Tile.WaterDeep);
  b.fillRect(99, 23, 4, 7, Tile.Water); // the overflow race, to the lip at y30
  b.set(98, 24, Tile.WaterShallow).set(103, 24, Tile.WaterShallow);
  // L2: plunge basin under the Crown lip, then the court channel.
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
  // THE FOOT-WATER LAW: the plunge pocket tucks to the wall — a
  // waterfall lands IN water; every south-facing spill is asserted
  // drop-0 by silverfall.test.ts.
  b.fillRect(98, 96, 6, 2, Tile.WaterShallow);
  // Bridges: the channel is crossed, never forded — and every bridge
  // lands on pavement, not lawn (the street law).
  for (let x = 98; x <= 103; x++) {
    b.set(x, 44, Tile.Bridge).set(x, 45, Tile.Bridge); // court -> guildhall
    b.set(x, 60, Tile.Bridge).set(x, 61, Tile.Bridge); // Lantern Row crossing
    b.set(x, 74, Tile.Bridge).set(x, 75, Tile.Bridge); // forge -> carpenters
    b.set(x, 86, Tile.Bridge).set(x, 87, Tile.Bridge); // yard -> mess terrace
  }
  b.fillRect(93, 74, 5, 2, Tile.Path); // avenue -> crafts bridge
  b.fillRect(93, 86, 5, 2, Tile.Path); // avenue -> mess bridge

  // ---------------------------------------------------------------
  // L3 — THE CROWN. Castle Silverfall westward, the Silver Shrine
  // east, the mere between them.
  // ---------------------------------------------------------------
  // CASTLE SILVERFALL — seat of the Silver Line. Curtain walls with
  // chamfered south shoulders (the diagonal budget's crown), a wide
  // south gate onto the forecourt, and three rooms with three jobs:
  // the throne hall, the armory & guard wing, the royal wing.
  b.fillRect(49, 11, 34, 18, Tile.StoneFloor);
  b.outlineRect(49, 11, 34, 18, Tile.WallStone);
  b.set(49, 28, Tile.WallStoneDiagNE); // the south shoulders
  b.set(82, 28, Tile.WallStoneDiagNW);
  b.set(65, 28, Tile.DoorwayStoneWide).set(66, 28, Tile.DoorwayStoneWide);
  b.set(55, 28, Tile.WallStoneWindow).set(60, 28, Tile.WallStoneWindow);
  b.set(71, 28, Tile.WallStoneWindow).set(76, 28, Tile.WallStoneWindow);
  b.set(49, 15, Tile.WallStoneWindow).set(49, 22, Tile.WallStoneWindow);
  b.set(82, 15, Tile.WallStoneWindow).set(82, 22, Tile.WallStoneWindow);
  b.set(55, 11, Tile.WallStoneWindow).set(65, 11, Tile.WallStoneWindow);
  b.set(76, 11, Tile.WallStoneWindow);
  // Two partition walls carve the three wings.
  for (let y = 12; y <= 27; y++) b.set(57, y, Tile.WallStone);
  b.set(57, 15, Tile.DoorwayStone).set(57, 24, Tile.DoorwayStone);
  for (let y = 12; y <= 27; y++) b.set(74, y, Tile.WallStone);
  b.set(74, 15, Tile.DoorwayStone).set(74, 24, Tile.DoorwayStone);
  // THE HALL OF THE SILVER LINE (x58-73): the twin thrones on the
  // dais, twin hearths, the herald's lectern, and two feast tables
  // running the floor to the gate — the hall feasts, and the Crown
  // watches it feast.
  b.set(59, 12, Tile.Hearth).set(72, 12, Tile.Hearth);
  b.set(61, 13, Tile.BannerPole).set(70, 13, Tile.BannerPole);
  // The thrones stand TOGETHER — a hand's reach apart, at the King's
  // own order. Two seats, one dais, no space for protocol between.
  b.set(65, 13, Tile.Chair).set(66, 13, Tile.Chair);
  b.setDetail(64, 14, Detail.Rug).setDetail(65, 14, Detail.Rug);
  b.setDetail(66, 14, Detail.Rug).setDetail(67, 14, Detail.Rug);
  b.set(69, 15, Tile.Lectern); // the herald reads the day's decrees
  for (let y = 18; y <= 23; y++) b.set(61, y, Tile.Table).set(70, y, Tile.Table);
  b.set(61, 17, Tile.Chair).set(61, 24, Tile.Chair);
  b.set(70, 17, Tile.Chair).set(70, 24, Tile.Chair);
  b.set(60, 19, Tile.Chair).set(60, 22, Tile.Chair);
  b.set(62, 18, Tile.Chair).set(62, 21, Tile.Chair);
  b.set(69, 18, Tile.Chair).set(69, 21, Tile.Chair);
  b.set(71, 19, Tile.Chair).set(71, 22, Tile.Chair);
  for (const y of [17, 20, 23]) {
    b.setDetail(65, y, Detail.Rug).setDetail(66, y, Detail.Rug);
  }
  b.set(63, 27, Tile.BannerPole).set(68, 27, Tile.BannerPole);
  b.setDetail(65, 27, Detail.Doormat).setDetail(66, 27, Detail.Doormat);
  // THE WEST WING (x50-56): armory north, guard hall south — the
  // castle guard eats and sleeps beside the steel it carries.
  for (let x = 50; x <= 56; x++) b.set(x, 20, Tile.WallStone);
  b.set(53, 20, Tile.DoorwayStone);
  b.set(50, 13, Tile.WeaponRack).set(50, 15, Tile.WeaponRack).set(50, 17, Tile.WeaponRack);
  b.set(52, 12, Tile.ToolRack);
  b.set(56, 13, Tile.Cabinet).set(56, 17, Tile.CrateGoods);
  b.set(52, 17, Tile.Table).set(53, 17, Tile.Chair); // the castellan's desk
  b.set(56, 12, Tile.Bookshelf); // the muster rolls
  b.set(51, 25, Tile.Bed).set(51, 26, Tile.Bed);
  b.set(55, 25, Tile.Bed).set(55, 26, Tile.Bed);
  b.set(53, 23, Tile.Table).set(52, 23, Tile.Chair).set(54, 23, Tile.Chair);
  b.set(56, 27, Tile.Brazier).set(50, 22, Tile.WeaponRack);
  // THE ROYAL WING (x75-81): the chamber north, the solar south —
  // where the Crown is only a household.
  for (let x = 75; x <= 81; x++) b.set(x, 20, Tile.WallStone);
  b.set(78, 20, Tile.DoorwayStone);
  b.set(76, 13, Tile.Bed).set(76, 14, Tile.Bed);
  b.set(80, 13, Tile.Bed).set(80, 14, Tile.Bed);
  b.setDetail(78, 15, Detail.RugRound);
  b.set(81, 12, Tile.Cabinet).set(75, 17, Tile.Bookshelf);
  b.set(78, 12, Tile.FlowerBox); // the queen's window box
  b.set(78, 23, Tile.Table).set(77, 23, Tile.Chair).set(79, 23, Tile.Chair);
  b.set(75, 22, Tile.Bookshelf).set(75, 25, Tile.Bookshelf);
  b.set(81, 25, Tile.Hearth).set(81, 21, Tile.Cabinet);
  b.setDetail(78, 25, Detail.Rug);
  // The forecourt: the Crown's parade strip — the y29-30 rows are the
  // Crown terrace's only east-west walk, so NOTHING solid stands on
  // them (the sealed-pocket law; the banners live inside the hall).
  b.fillRect(49, 29, 49, 2, Tile.StoneFloor);
  b.setDetail(65, 29, Detail.Doormat).setDetail(66, 29, Detail.Doormat);
  // THE SILVER SHRINE: a tight pillar ring on the mere's east shore,
  // reached by its own pilgrim path off the crown landing. The
  // mother-flame here lights every road lamp in the Dawnlands.
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
  // Mirrormere dressing: willows, still-water fishing, and the
  // queen's rest — a bench on the south shore where Eira takes the
  // mountain air at midday.
  b.set(86, 12, Tile.TreeWillow).set(110, 13, Tile.TreeWillow).set(85, 26, Tile.TreeWillow);
  b.set(90, 23, Tile.FishingSpot).set(106, 15, Tile.FishingSpot);
  b.set(88, 27, Tile.Bench).set(87, 27, Tile.FlowerBox);
  // Snow holds the high ground all year — clear of every wall.
  b.fillRect(124, 12, 3, 2, Tile.Snow);
  b.fillRect(108, 27, 4, 2, Tile.Snow).fillRect(113, 26, 3, 1, Tile.Snow);

  // ---------------------------------------------------------------
  // THE HIGH LEDGES — the walks behind the terraces, snow-bitten.
  // The y7-9 band behind the castle is the Rookery's back way.
  // ---------------------------------------------------------------
  for (let x = 10; x <= 165; x += 7) {
    if ((x * 7) % 3 === 0) b.fillRect(x, 5, 2, 1, Tile.Snow);
  }
  b.fillRect(70, 8, 3, 1, Tile.Snow);
  b.fillRect(120, 7, 4, 2, Tile.Snow).fillRect(140, 8, 2, 1, Tile.Snow);
  b.set(52, 8, Tile.Rock).set(98, 7, Tile.Rock).set(130, 8, Tile.Rock);
  b.set(24, 5, Tile.Rock).set(112, 5, Tile.Rock);

  // ---------------------------------------------------------------
  // L2 NW — THE ROOKERY: the rogues' quarter in the crag shadow
  // behind the bank. Older than the castle — the first quarrymen's
  // camp — and never on any map the Guildhall sells. Scree seals it
  // south except one narrow alley beside the bank's west wall; the
  // high ledge behind the castle is the back way. No lamps. No signs
  // pointing in. The Crown tolerates what the Magpie lets it see.
  // ---------------------------------------------------------------
  // The Undercroft mouth: cave mass in its own rock knoll, the arch,
  // the portal down to the Landing — and the braziers the Rookery
  // keeps fed, because THEY use the stair more than anyone.
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
  // THE BROKEN LANTERN — the den. One door, east, watching the alley.
  // The Magpie's chair by the hearth, the game table, and Calder's
  // counter where things without histories find new ones.
  b.fillRect(31, 22, 11, 7, Tile.WoodFloor);
  b.outlineRect(31, 22, 11, 7, Tile.WallWood);
  b.set(41, 25, Tile.DoorwayWood);
  b.set(35, 22, Tile.WallWoodWindow).set(31, 25, Tile.WallWoodWindow);
  b.set(32, 23, Tile.Hearth);
  b.set(33, 25, Tile.Chair).setDetail(34, 25, Detail.RugRound); // the Magpie holds court
  b.set(36, 23, Tile.Table).set(35, 23, Tile.Chair).set(37, 23, Tile.Chair);
  b.set(38, 26, Tile.Counter).set(39, 26, Tile.Counter); // Calder's fence counter
  b.set(40, 23, Tile.CrateGoods).set(32, 27, Tile.Barrel);
  b.set(33, 27, Tile.ChestMossy); // the stash nobody official has opened
  b.setDetail(40, 25, Detail.Doormat);
  b.sign(42, 26, 'THE BROKEN LANTERN', ['ask for nothing,', 'see nothing']);
  // The lookout's corner at the alley mouth, and the camp scatter.
  b.set(44, 27, Tile.Crate).set(45, 28, Tile.Barrel);
  b.set(43, 28, Tile.Bench);
  b.set(46, 24, Tile.Campfire).set(47, 25, Tile.Bench);
  b.set(46, 10, Tile.Rock).set(45, 11, Tile.Rock).set(47, 12, Tile.Rock);
  b.set(33, 9, Tile.CaveRubble).set(44, 22, Tile.CaveRubble);
  b.setDetail(34, 10, Detail.Pebbles).setDetail(46, 27, Detail.Pebbles);
  b.set(32, 7, Tile.Stump).set(43, 8, Tile.Stump).set(47, 22, Tile.Stump);
  b.set(31, 11, Tile.GrassTall).set(45, 24, Tile.GrassTall).set(34, 29, Tile.GrassTall);
  b.setDetail(44, 25, Detail.Tuft).setDetail(32, 12, Detail.Tuft).setDetail(46, 21, Detail.Tuft);
  // The scree seal: solid rock across the quarter's south face, with
  // the one alley gap at x42-43 hugging the bank's west wall.
  for (let x = 31; x <= 41; x++) {
    b.set(x, 30, Tile.Rock);
    if (x % 3 === 0) b.set(x, 31, Tile.Rock);
  }
  for (let x = 44; x <= 47; x++) b.set(x, 30, Tile.Rock).set(x, 31, Tile.Rock);

  // ---------------------------------------------------------------
  // L2 — THE SILVER COURT.
  // ---------------------------------------------------------------
  // The GRAND COURT: the plaza at the stair crown. The silver
  // fountain in a stone square, the crier's lectern, the moot board.
  b.fillRect(70, 32, 28, 17, Tile.StoneFloor);
  b.set(78, 39, Tile.WaterShallow).set(79, 39, Tile.WaterShallow);
  b.set(78, 40, Tile.WaterShallow).set(79, 40, Tile.WaterShallow);
  b.set(76, 37, Tile.FlowerBox).set(81, 37, Tile.FlowerBox);
  b.set(76, 42, Tile.FlowerBox).set(81, 42, Tile.FlowerBox);
  b.set(77, 36, Tile.Bench).set(80, 36, Tile.Bench);
  b.set(77, 43, Tile.Bench).set(80, 43, Tile.Bench);
  b.set(74, 34, Tile.Lectern); // the crier reads the Crown's word here
  b.sign(72, 37, 'THE GRAND COURT', ['the Crown hears moot', 'first bell of the month']);
  b.set(72, 33, Tile.BannerPole).set(95, 33, Tile.BannerPole);
  b.set(72, 47, Tile.LampPost).set(95, 47, Tile.LampPost);
  // The court stall: one licensed pitch on the plaza flags.
  b.stamp(MARKET_STALL, 73, 44);
  // The east court: a quiet planter nook off the guildhall bridge.
  b.set(95, 37, Tile.FlowerBox);
  b.set(94, 40, Tile.Bench).set(96, 40, Tile.Bench);
  // THE BANK OF SILVERFALL fronts the court from the west — the
  // mountain's coin sleeps here, under the Crown's countersign.
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
  // The working floor: teller desks and the ledger wall. The counter
  // BREAKS at y40 — teller gate, vault door, and front door align.
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
  b.fillRect(65, 40, 5, 2, Tile.StoneFloor); // the door apron — coin walks on stone
  // THE GUILDHALL fronts the court from the east, across the falls
  // bridge — every trade's charter under one roof.
  b.fillRect(106, 34, 22, 16, Tile.StoneFloor);
  b.outlineRect(106, 34, 22, 16, Tile.WallStone);
  b.set(106, 41, Tile.DoorwayStone).set(106, 42, Tile.DoorwayStone);
  b.set(106, 37, Tile.WallStoneWindow).set(106, 46, Tile.WallStoneWindow);
  b.set(112, 34, Tile.WallStoneWindow).set(121, 34, Tile.WallStoneWindow);
  b.set(112, 49, Tile.WallStoneWindow).set(121, 49, Tile.WallStoneWindow);
  b.set(127, 38, Tile.WallStoneWindow).set(127, 45, Tile.WallStoneWindow);
  b.fillRect(104, 41, 2, 5, Tile.StoneFloor); // door walk to the bridge
  // The charter floor: the great table, the trades' library, the
  // seal counter; the records room keeps the deeds and the dust.
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
  b.set(126, 38, Tile.Cabinet).set(126, 43, Tile.Cabinet).set(123, 47, Tile.Cabinet);
  b.set(124, 35, Tile.Bookshelf).set(125, 35, Tile.Bookshelf);
  b.set(124, 44, Tile.Table).set(125, 44, Tile.Chair);
  b.set(126, 47, Tile.CrateGoods);
  // THE ARCANUM: the enchanters' house on the southwest walk — runes
  // burn brighter this high. Solvei teaches, for a price.
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
  // of the roads answers to this room, and the Crown's charter on
  // the wall says so.
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
  // The L2 court walks: bank front -> Silver Setting -> arcanum, and
  // the court -> chapter house link. Streets first.
  b.fillRect(48, 49, 22, 2, Tile.StoneFloor);
  b.fillRect(47, 51, 2, 5, Tile.StoneFloor);
  b.fillRect(71, 49, 3, 3, Tile.StoneFloor);

  // ---------------------------------------------------------------
  // L2 — LANTERN ROW: the shopping street. Two rows of lamps, four
  // shopfronts, the bridgehead stalls, and the falls running under
  // the middle of it. The capital buys here.
  // ---------------------------------------------------------------
  b.fillRect(93, 60, 5, 2, Tile.StoneFloor); // avenue -> bridge
  b.fillRect(104, 60, 41, 2, Tile.StoneFloor); // the Row proper
  // THE SILVER SETTING — the jeweler on the court walk, the city's
  // signature counter: rings, settings, and the Crown's commissions.
  b.fillRect(50, 52, 13, 9, Tile.StoneFloor);
  b.outlineRect(50, 52, 13, 9, Tile.WallStone);
  b.set(56, 52, Tile.DoorwayStone);
  b.set(52, 52, Tile.WallStoneWindow).set(60, 52, Tile.WallStoneWindow);
  b.set(50, 56, Tile.WallStoneWindow).set(62, 56, Tile.WallStoneWindow);
  b.set(53, 55, Tile.Counter).set(54, 55, Tile.Counter).set(55, 55, Tile.Counter);
  b.set(51, 53, Tile.Cabinet).set(52, 53, Tile.Cabinet); // the display cases
  b.set(59, 53, Tile.Workbench); // the setting bench
  b.set(61, 54, Tile.Furnace); // the small silver furnace
  b.set(51, 59, Tile.CrateGoods).set(61, 59, Tile.Cabinet);
  b.set(58, 58, Tile.Table).set(57, 58, Tile.Chair);
  b.setDetail(56, 53, Detail.Doormat).setDetail(54, 57, Detail.Rug);
  b.fillRect(54, 51, 5, 1, Tile.StoneFloor); // the doorstep
  b.sign(59, 51, 'THE SILVER SETTING', ['rings, settings,', 'the mountain made small']);
  // THE CLOTH HALL — Ottilie's looms behind, bolts counter in front.
  b.fillRect(105, 51, 11, 9, Tile.WoodFloor);
  b.outlineRect(105, 51, 11, 9, Tile.WallWood);
  b.set(110, 59, Tile.DoorwayWood);
  b.set(107, 59, Tile.WallWoodWindow).set(113, 59, Tile.WallWoodWindow);
  b.set(105, 55, Tile.WallWoodWindow).set(115, 55, Tile.WallWoodWindow);
  b.set(107, 53, Tile.Loom).set(107, 56, Tile.Loom);
  b.set(109, 52, Tile.Crate); // raw wool off the High Road
  b.set(109, 57, Tile.Counter).set(110, 57, Tile.Counter).set(111, 57, Tile.Counter);
  b.set(113, 52, Tile.Cabinet).set(114, 52, Tile.Bookshelf); // patterns and orders
  b.setDetail(113, 56, Detail.RugRound); // the finished-bolt corner
  b.setDetail(110, 58, Detail.Doormat);
  b.sign(113, 61, 'THE CLOTH HALL', ['bolts up the Silver Stair']);
  // INKS & CHARTS — the scrivener: folios, deeds, and honest maps.
  b.fillRect(118, 51, 9, 9, Tile.WoodFloor);
  b.outlineRect(118, 51, 9, 9, Tile.WallWood);
  b.set(122, 59, Tile.DoorwayWood);
  b.set(119, 59, Tile.WallWoodWindow).set(125, 59, Tile.WallWoodWindow);
  b.set(118, 55, Tile.WallWoodWindow).set(126, 55, Tile.WallWoodWindow);
  b.set(119, 52, Tile.Bookshelf).set(120, 52, Tile.Bookshelf);
  b.set(124, 52, Tile.Bookshelf).set(125, 52, Tile.Bookshelf);
  b.set(121, 54, Tile.Lectern); // the chart desk — the honest maps
  b.set(119, 56, Tile.Table).set(120, 56, Tile.Chair);
  b.set(123, 56, Tile.Counter).set(124, 56, Tile.Counter);
  b.set(125, 57, Tile.CrateGoods);
  b.setDetail(122, 58, Detail.Doormat);
  b.sign(125, 61, 'INKS & CHARTS', ['deeds drawn, maps true']);
  // THE SILVER FLAGON — the capital's inn: the bar, the hearth, the
  // guest wing, and every rumor the High Road carries.
  b.fillRect(129, 50, 15, 10, Tile.WoodFloor);
  b.outlineRect(129, 50, 15, 10, Tile.WallWood);
  b.set(135, 59, Tile.DoorwayWood).set(136, 59, Tile.DoorwayWood);
  b.set(132, 59, Tile.WallWoodWindow).set(139, 59, Tile.WallWoodWindow);
  b.set(129, 54, Tile.WallWoodWindow).set(134, 50, Tile.WallWoodWindow);
  b.set(130, 51, Tile.Hearth);
  b.set(131, 56, Tile.Counter).set(132, 56, Tile.Counter).set(133, 56, Tile.Counter);
  b.set(130, 52, Tile.Barrel).set(130, 58, Tile.Barrel); // the cellar row
  b.set(133, 52, Tile.Table).set(132, 52, Tile.Chair).set(134, 52, Tile.Chair);
  b.set(136, 54, Tile.Table).set(135, 54, Tile.Chair).set(137, 54, Tile.Chair);
  b.setDetail(134, 57, Detail.Rug);
  // The guest wing, partitioned east.
  for (let y = 51; y <= 58; y++) b.set(139, y, Tile.WallWood);
  b.set(139, 54, Tile.DoorwayWood);
  b.set(141, 51, Tile.Bed).set(141, 52, Tile.Bed);
  b.set(143, 51, Tile.Bed).set(143, 52, Tile.Bed);
  b.set(141, 57, Tile.Bed).set(141, 58, Tile.Bed);
  b.set(143, 58, Tile.Cabinet);
  b.setDetail(142, 55, Detail.RugRound);
  b.setDetail(135, 58, Detail.Doormat).setDetail(136, 58, Detail.Doormat);
  b.sign(139, 61, 'THE SILVER FLAGON', ['beds, board,', 'and the news first']);
  // The bridgehead stalls: two pitches on the west bank of the falls.
  b.stamp(MARKET_STALL, 94, 53);
  b.stamp(MARKET_STALL, 94, 57);
  // The Row's lamps — the name is the promise.
  b.set(105, 62, Tile.LampPost).set(117, 62, Tile.LampPost);
  b.set(128, 62, Tile.LampPost).set(144, 62, Tile.LampPost);
  b.sign(104, 62, 'LANTERN ROW', ['shopfronts to the falls'], Tile.Signpost);
  // The east promenade: lamps and yews along the hall-terrace walk.
  b.set(141, 40, Tile.TreeYew).set(143, 45, Tile.TreeYew);
  b.set(134, 36, Tile.LampPost).set(141, 48, Tile.Bench);
  b.set(64, 51, Tile.TreeYew);

  // ---------------------------------------------------------------
  // THE COURT GATE — the inner ward's word. The civic terrace is a
  // fortress the mountain built (a cliff on every side, three stairs
  // for doors), so the Crown armors only its one grand tooth: nine
  // tiles of garrison arch across the avenue where the Silver Stair
  // tops out, short battlement wings dying into the rim — west a cut
  // stub, east into the falls channel. The side stairs stay open
  // working stairs on purpose: this arch is the law reading itself
  // aloud to everyone who climbs, not a lock on the city's own feet.
  // ---------------------------------------------------------------
  b.fillRect(81, 62, 3, 1, Tile.WallGarrison); // west wing
  b.fillRect(93, 62, 6, 1, Tile.WallGarrison); // east wing, to the water
  for (let x = 84; x <= 92; x++) b.set(x, 62, Tile.GateGarrison);
  b.sign(81, 60, 'THE COURT GATE', ['the Crown hears who climbs'], Tile.Signpost);

  // ---------------------------------------------------------------
  // L1 WEST — THE EMBERWAY: the smelting district. Silver first,
  // everything else after. The working lane strings the whole
  // district onto one street: mine yard -> smelter -> assay house ->
  // Great Forge -> the avenue.
  // ---------------------------------------------------------------
  b.fillRect(12, 82, 72, 2, Tile.Path); // the Emberway lane
  b.sign(80, 81, 'THE EMBERWAY', ['ore to ingot to edge'], Tile.Signpost);
  // THE MINE YARD: the open workings under the west cliffs. Ore
  // stands in WORKING FACES with shoring, spoil heaps, and a loading
  // corner by the smelter — not a sprinkle.
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
  b.set(47, 72, Tile.Barrel).setDetail(43, 70, Detail.Pebbles); // the pour-side clutter
  b.fillRect(39, 79, 2, 3, Tile.Path); // doorstep to the lane
  b.sign(37, 80, 'THE SMELTER', ['pour days: all of them']);
  // THE ASSAY HOUSE: where the Crown weighs what the mountain gives.
  // Every ingot over the counter, every tenth one into the tithe
  // vault — Runa's scales have never been wrong, and never kind.
  b.fillRect(50, 74, 8, 7, Tile.StoneFloor);
  b.outlineRect(50, 74, 8, 7, Tile.WallStone);
  b.set(54, 80, Tile.DoorwayStone);
  b.set(52, 74, Tile.WallStoneWindow).set(50, 77, Tile.WallStoneWindow);
  b.set(52, 77, Tile.Counter).set(53, 77, Tile.Counter).set(54, 77, Tile.Counter);
  b.set(51, 75, Tile.Vault); // the tithe vault
  b.set(55, 75, Tile.Table).set(55, 76, Tile.Chair); // the scales table
  b.set(56, 79, Tile.Cabinet);
  b.setDetail(54, 79, Detail.Doormat);
  b.sign(56, 81, 'THE ASSAY HOUSE', ['weighed true, taxed truer']);
  // The tally yard between smelter and assay: staged ore, staged
  // ingots, and the barrows that move them.
  b.set(52, 68, Tile.Crate).set(53, 70, Tile.Crate).set(51, 71, Tile.CrateGoods);
  b.setDetail(52, 71, Detail.Pebbles).setDetail(54, 69, Detail.Pebbles);
  // THE GREAT FORGE: the mountain's anvils, working in a line —
  // furnace to anvil to quench. Balla teaches the trials here.
  b.fillRect(61, 66, 21, 15, Tile.StoneFloor);
  b.outlineRect(61, 66, 21, 15, Tile.WallStone);
  b.set(70, 80, Tile.DoorwayStoneWide).set(71, 80, Tile.DoorwayStoneWide);
  b.set(65, 80, Tile.WallStoneWindow).set(77, 80, Tile.WallStoneWindow);
  b.set(61, 71, Tile.WallStoneWindow).set(61, 76, Tile.WallStoneWindow);
  b.set(81, 71, Tile.WallStoneWindow).set(66, 66, Tile.WallStoneWindow).set(76, 66, Tile.WallStoneWindow);
  b.set(63, 69, Tile.Furnace).set(63, 74, Tile.Furnace);
  b.set(62, 67, Tile.Crate).set(62, 76, Tile.Crate); // the coal
  b.set(66, 69, Tile.Anvil).set(66, 74, Tile.Anvil).set(69, 71, Tile.Anvil);
  b.set(68, 69, Tile.Basin).set(68, 74, Tile.Basin); // the quench tubs
  b.set(76, 68, Tile.Workbench); // finishing bench
  b.set(80, 68, Tile.ToolRack).set(80, 71, Tile.WeaponRack).set(80, 74, Tile.WeaponRack);
  b.set(67, 78, Tile.Counter).set(68, 78, Tile.Counter).set(69, 78, Tile.Counter);
  b.set(65, 78, Tile.CrateGoods).set(74, 78, Tile.Bench); // commissions wait here
  b.set(76, 72, Tile.Workbench).set(79, 77, Tile.CrateGoods); // the fitting corner
  b.setDetail(70, 79, Detail.Doormat).setDetail(71, 79, Detail.Doormat);
  b.setDetail(67, 72, Detail.Pebbles).setDetail(72, 75, Detail.Pebbles);
  b.setDetail(74, 70, Detail.Pebbles).setDetail(78, 74, Detail.Pebbles);
  b.fillRect(70, 81, 2, 1, Tile.Path); // doorstep to the lane
  b.sign(67, 81, 'THE GREAT FORGE', ['silver worked, steel earned']);
  // The forge yard: the shift's rest — a true fire circle, racks by
  // the door, the stock stacked in one corner instead of everywhere.
  b.fillRect(76, 84, 18, 9, Tile.Dirt);
  b.set(82, 88, Tile.Campfire);
  b.set(80, 87, Tile.Bench).set(80, 89, Tile.Bench);
  b.set(84, 87, Tile.Bench).set(84, 89, Tile.Bench);
  b.set(77, 85, Tile.WeaponRack).set(79, 85, Tile.ToolRack);
  b.set(91, 85, Tile.Crate).set(92, 90, Tile.Barrel).set(91, 91, Tile.CrateGoods);
  b.setDetail(83, 90, Detail.Pebbles).setDetail(86, 86, Detail.Pebbles);
  // THE MASONS' YARD: stone stock on the west row, benches facing,
  // finished work crated, the rubble heap where it belongs.
  b.fillRect(32, 84, 15, 9, Tile.Dirt);
  b.set(34, 86, Tile.PillarStone).set(34, 90, Tile.PillarStone); // stock
  b.set(36, 86, Tile.Crate).set(36, 90, Tile.Crate); // rough blocks
  b.set(39, 86, Tile.Workbench).set(39, 90, Tile.Workbench);
  b.set(43, 86, Tile.CrateGoods); // finished ashlar
  b.set(44, 90, Tile.CaveRubble).set(45, 91, Tile.CaveRubble);
  b.setDetail(37, 88, Detail.Pebbles).setDetail(42, 91, Detail.Pebbles);
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
  // L1 EAST — THE TIMBERWAY: the woodworking district. The spine
  // runs bridge -> carpenters -> lane; the saw yard feeds the hall,
  // the hall feeds the cooper and the fletcher, and the cookhouse
  // feeds everyone.
  // ---------------------------------------------------------------
  b.fillRect(104, 64, 2, 18, Tile.Path); // the crafts spine (bridge -> lane)
  b.fillRect(104, 80, 49, 2, Tile.Path); // the east working lane
  b.sign(107, 64, 'THE TIMBERWAY', ['sawn true, joined tight'], Tile.Signpost);
  // THE CARPENTERS' HALL: the work line north — carving benches to
  // workbenches, seasoned stock crated — and the commission counter
  // south, where the city orders its doors, carts, and cradles.
  b.fillRect(107, 66, 13, 13, Tile.WoodFloor);
  b.outlineRect(107, 66, 13, 13, Tile.WallWood);
  b.set(107, 71, Tile.DoorwayWood).set(107, 72, Tile.DoorwayWood);
  b.set(107, 68, Tile.WallWoodWindow).set(107, 76, Tile.WallWoodWindow);
  b.set(112, 66, Tile.WallWoodWindow).set(117, 66, Tile.WallWoodWindow);
  b.set(112, 78, Tile.WallWoodWindow).set(117, 78, Tile.WallWoodWindow);
  b.set(109, 68, Tile.CarvingBench).set(112, 68, Tile.CarvingBench);
  b.set(115, 68, Tile.Workbench).set(118, 69, Tile.Workbench);
  b.set(118, 67, Tile.Crate); // seasoned timber
  b.setDetail(110, 70, Detail.Sawdust).setDetail(114, 70, Detail.Sawdust);
  b.set(110, 75, Tile.Counter).set(111, 75, Tile.Counter).set(112, 75, Tile.Counter);
  b.set(118, 76, Tile.Bookshelf); // the pattern books
  b.set(108, 77, Tile.CrateGoods);
  b.set(115, 76, Tile.Table).set(116, 76, Tile.Chair);
  b.setDetail(108, 71, Detail.Doormat).setDetail(108, 72, Detail.Doormat);
  b.sign(110, 80, 'THE CARPENTERS\' HALL', ['doors, carts, cradles']);
  // THE SAW YARD: the mountain's pine comes down to planks here —
  // log stacks, the sawpit, and sawdust over everything.
  b.fillRect(122, 64, 13, 9, Tile.Dirt);
  b.set(124, 65, Tile.Stump).set(125, 65, Tile.Stump).set(126, 65, Tile.Stump); // the log stack
  b.set(124, 67, Tile.Stump).set(125, 67, Tile.Stump);
  b.set(132, 65, Tile.Crate).set(133, 66, Tile.Crate); // planks, strapped
  b.set(127, 70, Tile.Workbench).set(128, 70, Tile.Workbench); // the sawpit
  b.setDetail(127, 71, Detail.Sawdust).setDetail(128, 71, Detail.Sawdust);
  b.setDetail(126, 69, Detail.Sawdust);
  b.set(123, 70, Tile.ToolRack).set(133, 71, Tile.Barrel);
  b.set(130, 67, Tile.Brazier);
  b.setDetail(131, 69, Detail.Pebbles);
  // THE FLETCHER'S PERCH: bows and shafts off the saw yard's best
  // straight grain. Haki fletches for the watch and the road.
  b.fillRect(122, 74, 8, 6, Tile.WoodFloor);
  b.outlineRect(122, 74, 8, 6, Tile.WallWood);
  b.set(125, 79, Tile.DoorwayWood);
  b.set(123, 79, Tile.WallWoodWindow).set(128, 79, Tile.WallWoodWindow);
  b.set(123, 75, Tile.CarvingBench);
  b.set(128, 75, Tile.WeaponRack); // the finished bows
  b.set(127, 77, Tile.Crate); // feathers and staves
  b.set(124, 77, Tile.Counter);
  b.setDetail(125, 78, Detail.Doormat);
  b.sign(128, 81, 'THE FLETCHER\'S PERCH', ['straight grain, true flight']);
  // THE COOPERAGE: staves to barrels for the whole province — the
  // smelter's quench tubs, the Flagon's cellar, the road's casks.
  b.fillRect(137, 66, 9, 8, Tile.WoodFloor);
  b.outlineRect(137, 66, 9, 8, Tile.WallWood);
  b.set(141, 73, Tile.DoorwayWood);
  b.set(139, 73, Tile.WallWoodWindow).set(143, 73, Tile.WallWoodWindow);
  b.set(137, 69, Tile.WallWoodWindow);
  b.set(139, 68, Tile.Workbench); // the stave bench
  b.set(143, 67, Tile.Barrel).set(143, 69, Tile.Barrel).set(143, 71, Tile.Barrel); // the product
  b.set(138, 67, Tile.Crate); // split staves
  b.set(138, 71, Tile.ToolRack);
  b.setDetail(141, 72, Detail.Doormat).setDetail(140, 69, Detail.Sawdust);
  b.fillRect(140, 74, 2, 6, Tile.Path); // spur to the lane
  b.sign(143, 75, 'THE COOPERAGE', ['staves bent, hoops rung']);
  // THE MESS TERRACE: stone flags between the falls channel and the
  // cookhouse — long tables, bench rows, braziers against the cold.
  b.fillRect(108, 83, 14, 10, Tile.StoneFloor);
  b.set(111, 85, Tile.Table).set(112, 85, Tile.Table).set(113, 85, Tile.Table);
  b.set(111, 84, Tile.Bench).set(112, 84, Tile.Bench).set(113, 84, Tile.Bench);
  b.set(111, 86, Tile.Bench).set(112, 86, Tile.Bench).set(113, 86, Tile.Bench);
  b.set(116, 89, Tile.Table).set(117, 89, Tile.Table).set(118, 89, Tile.Table);
  b.set(116, 88, Tile.Bench).set(117, 88, Tile.Bench).set(118, 88, Tile.Bench);
  b.set(116, 90, Tile.Bench).set(117, 90, Tile.Bench).set(118, 90, Tile.Bench);
  b.set(109, 84, Tile.Brazier).set(120, 92, Tile.Brazier);
  b.set(109, 88, Tile.Bench); // the channel overlook
  b.set(120, 83, Tile.Barrel);
  // THE COOKHOUSE feeds both districts from the middle. Hearth pair
  // north, prep line beside them, pantry south-east, serving pass
  // just inside the door. Signy lodges at the Flagon — the kitchen
  // never sleeps long enough to need a bed.
  b.fillRect(124, 82, 13, 11, Tile.WoodFloor);
  b.outlineRect(124, 82, 13, 11, Tile.WallWood);
  b.set(124, 87, Tile.DoorwayWood);
  b.set(124, 84, Tile.WallWoodWindow).set(128, 82, Tile.WallWoodWindow);
  b.set(133, 82, Tile.WallWoodWindow).set(136, 87, Tile.WallWoodWindow);
  b.set(128, 92, Tile.WallWoodWindow).set(133, 92, Tile.WallWoodWindow);
  b.set(126, 83, Tile.Hearth).set(129, 83, Tile.Hearth);
  b.set(132, 83, Tile.Counter).set(133, 83, Tile.Counter); // the prep line
  b.set(135, 83, Tile.Basin);
  b.set(126, 86, Tile.Counter).set(126, 88, Tile.Counter); // the serving pass
  b.set(134, 90, Tile.CrateGoods).set(135, 88, Tile.Barrel).set(133, 91, Tile.Crate);
  b.set(129, 89, Tile.Table).set(128, 89, Tile.Chair);
  b.setDetail(125, 87, Detail.Doormat);
  b.fillRect(122, 87, 2, 1, Tile.Path); // doorstep to the terrace
  b.sign(127, 81, 'THE COOKHOUSE', ['both shifts fed, no favorites']);
  // THE DISPENSARY: Wyn's counter fronts the lane; she sleeps over
  // the shop, and the Greenstair grows half her stock.
  b.fillRect(140, 82, 10, 10, Tile.WoodFloor);
  b.outlineRect(140, 82, 10, 10, Tile.WallWood);
  b.set(144, 82, Tile.DoorwayWood);
  b.set(141, 82, Tile.WallWoodWindow).set(147, 82, Tile.WallWoodWindow);
  b.set(140, 87, Tile.WallWoodWindow).set(149, 87, Tile.WallWoodWindow);
  b.set(142, 84, Tile.Alembic);
  b.set(141, 89, Tile.Cabinet).set(147, 83, Tile.Bookshelf);
  b.set(148, 89, Tile.Bed); // Wyn sleeps over the shop
  b.set(143, 86, Tile.Counter).set(144, 86, Tile.Counter);
  b.set(146, 86, Tile.Table).set(146, 87, Tile.Chair);
  b.setDetail(144, 83, Detail.Doormat).setDetail(142, 87, Detail.RugRound);
  b.sign(147, 81, 'THE DISPENSARY', ['tinctures for the climb']);
  // The tanning pad, downwind of everything.
  b.fillRect(152, 84, 4, 4, Tile.Dirt);
  b.set(153, 85, Tile.TanningRack).set(155, 86, Tile.Barrel);
  b.setDetail(154, 87, Detail.Pebbles);
  // THE GREENSTAIR: the east arm's terraced gardens — the mountain
  // feeds itself. Herb fence, field pads, and the crag pasture.
  b.outlineRect(151, 66, 13, 11, Tile.Fence);
  b.set(151, 71, Tile.Grass); // gate, west, on its own lane spur
  b.fillRect(150, 71, 1, 10, Tile.Path); // Greenstair gate spur
  b.set(158, 67, Tile.Basin).set(152, 67, Tile.Crate);
  for (let x = 153; x <= 161; x += 1) {
    b.set(x, 68, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 71, x % 2 === 0 ? Tile.Tilled : Tile.MoonbellMid);
    b.set(x, 74, x % 2 === 0 ? Tile.CarrotRipe : Tile.Tilled);
  }
  b.set(153, 75, Tile.BerryBush).set(160, 75, Tile.BerryBush);
  // Two field terraces up the arm; the middle pad is the pasture.
  for (const [gx, gy] of [
    [150, 14], [150, 30],
  ] as const) {
    b.fillRect(gx, gy, 14, 8, Tile.Dirt);
    for (let x = gx + 1; x <= gx + 12; x += 1) {
      b.set(x, gy + 1, x % 2 === 0 ? Tile.WheatMid : Tile.Tilled);
      b.set(x, gy + 3, x % 2 === 0 ? Tile.Tilled : Tile.CottonMid);
      b.set(x, gy + 5, x % 2 === 0 ? Tile.WheatMid : Tile.Tilled);
    }
    b.set(gx + 1, gy + 7, Tile.BerryBush).set(gx + 12, gy + 7, Tile.BerryBush);
  }
  // THE CRAG PASTURE: the city's rams keep the middle terrace down.
  b.outlineRect(150, 46, 14, 8, Tile.Fence);
  b.set(150, 49, Tile.Grass); // the gate, west
  b.set(152, 47, Tile.Basin);
  b.setDetail(154, 49, Detail.Straw).setDetail(159, 51, Detail.Straw);
  b.fillRect(160, 47, 2, 1, Tile.Snow);
  b.set(160, 40, Tile.BerryBush).set(158, 56, Tile.FibrePlant).set(162, 24, Tile.FibrePlant);
  b.set(148, 22, Tile.TreeOak).set(160, 36, Tile.TreeOak).set(148, 58, Tile.TreeOak);

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
  // THE CITY CURTAIN — garrison masonry across the massif's mouth:
  // the capital's outer word, laid AFTER the scree so both runs die
  // into the ridges the mountain already built. A single honest
  // rampart three bodies tall (the separate-masonry law made civic),
  // battered talus to crenellated wall-walk, with drum towers proud
  // of the line and the Silver Gate carved through the middle.
  // (Laid below, after the scree ridges it must die into.)
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
  // The curtain runs: one course of garrison masonry, overwriting the
  // scree's own y112 rocks at both ends so the wall visibly sinks
  // into the ridges — nobody built a neat terminus up a mountain.
  b.fillRect(84, 113, 9, 2, Tile.StoneFloor); // the gate threshold first
  b.fillRect(26, 112, 55, 1, Tile.WallGarrison); // west run, into the scree
  b.fillRect(96, 112, 55, 1, Tile.WallGarrison); // east run, into the scree
  // The flanking towers: solid drums proud of the line to the south,
  // shoulders cut at 45 — the curtain watches its own foot.
  for (const tx of [40, 60, 110, 132] as const) {
    b.fillRect(tx, 113, 3, 2, Tile.WallGarrison);
    b.set(tx, 114, Tile.WallGarrisonDiagNE);
    b.set(tx + 2, 114, Tile.WallGarrisonDiagNW);
  }
  // THE GATE BASTIONS: two five-square drums flanking the passage,
  // all four corners chamfered — the old octagon towers reborn at
  // siege scale, solid to the crown (a bailey has no ceiling to owe).
  for (const bx of [81, 91] as const) {
    b.fillRect(bx, 110, 5, 5, Tile.WallGarrison);
    b.set(bx, 110, Tile.WallGarrisonDiagSE);
    b.set(bx + 4, 110, Tile.WallGarrisonDiagSW);
    b.set(bx, 114, Tile.WallGarrisonDiagNE);
    b.set(bx + 4, 114, Tile.WallGarrisonDiagNW);
  }
  // THE SILVER GATE — the grand gatehouse: voussoir arch carved
  // through the masonry, portcullis raised in the lunette, iron-bound
  // leaves standing open. The High Road marches straight through.
  for (let x = 86; x <= 90; x++) b.set(x, 112, Tile.GateGarrison);
  b.set(83, 109, Tile.BannerPole).set(93, 109, Tile.BannerPole);
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
  // THE GATEHOUSE: the watch's desk at the door of the city —
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
  b.sign(93, 119, 'SILVERFALL', ['Seat of the Silver Line.', 'Mind the edge.'], Tile.Signpost);

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
    [50, 65], [59, 64], [51, 84], [50, 91], [96, 92],
    [146, 62], [147, 78], [120, 80],
    [68, 34], [68, 46], [131, 46], [42, 48],
    [46, 24], [82, 11], [112, 11], [126, 28],
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
  // THE PEOPLE — the capital's cast. Placements are each routine's
  // post (the post-is-the-origin law).
  // ---------------------------------------------------------------
  // The Crown.
  b.actor('king_aeriex', 65.5, 14.4, Math.PI / 2, 'fall_king');
  b.actor('queen_kayri', 66.5, 14.4, Math.PI / 2, 'fall_queen');
  b.actor('warden_maren', 52.5, 18.4, 0, 'fall_warden');
  b.actor('castle_guard', 62.5, 29.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 69.5, 29.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 53.5, 24.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('shrinekeeper_sella', 118.5, 20.5, -Math.PI / 2, 'fall_shrinekeeper');
  // The Silver Court.
  b.actor('bursar_odele', 53.5, 40.5, 0, 'fall_bursar');
  b.actor('enchantress_solvei', 37.5, 55.3, -Math.PI / 2, 'fall_enchantress');
  b.actor('marshal_kestrel', 71.5, 55.3, Math.PI / 2, 'fall_marshal');
  // The gate watch stands OUTSIDE the Silver Gate, flanking the road
  // mouth under the bastions — the first questions come before the
  // arch, not after. A third keeps the gatehouse desk, a fourth the
  // court, and a fifth holds the Court Gate at the stair crown.
  b.actor('silverfall_watch', 85.5, 115.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 91.5, 115.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 41.5, 105.5, 0, 'fall_watch');
  b.actor('silverfall_watch', 92.5, 33.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 82.5, 61.5, Math.PI / 2, 'fall_watch');
  // Lantern Row.
  b.actor('silversmith_vigdis', 54.5, 54.4, Math.PI / 2, 'fall_silversmith');
  b.actor('weaver_ottilie', 110.5, 56.4, Math.PI / 2, 'fall_weaver');
  b.actor('scrivener_tove', 123.5, 55.4, Math.PI / 2, 'fall_scrivener');
  b.actor('innkeep_ragna', 132.5, 55.4, Math.PI / 2, 'fall_innkeep');
  b.actor('galleria_trader', 95.5, 52.4, Math.PI / 2, 'fall_trader');
  b.actor('galleria_trader', 95.5, 56.4, Math.PI / 2, 'fall_trader');
  b.actor('galleria_trader', 74.5, 43.4, Math.PI / 2, 'fall_trader');
  // The Emberway.
  b.actor('foreman_grettir', 20.5, 79.5, 0, 'fall_foreman');
  b.actor('smeltmaster_koll', 38.5, 69.4, Math.PI, 'fall_smeltmaster');
  b.actor('assayer_runa', 53.5, 76.4, Math.PI / 2, 'fall_assayer');
  b.actor('forgemistress_balla', 66.5, 70.3, Math.PI, 'fall_forgemistress');
  b.actor('mason_petra', 39.5, 87.3, -Math.PI / 2, 'fall_mason');
  // The Timberway.
  b.actor('carpenter_stig', 112.5, 69.3, Math.PI, 'fall_carpenter');
  b.actor('fletcher_haki', 123.5, 76.4, -Math.PI / 2, 'fall_fletcher');
  b.actor('cooper_dagny', 139.5, 69.4, -Math.PI / 2, 'fall_cooper');
  b.actor('cook_signy', 127.5, 84.3, -Math.PI / 2, 'fall_cook');
  b.actor('herbalist_wyn', 144.5, 85.3, -Math.PI / 2, 'fall_herbalist');
  b.actor('gardener_ivo', 157.5, 71.5, Math.PI / 2, 'fall_gardener');
  // The Gatefront.
  b.actor('hostler_osa', 60.5, 101.5, -Math.PI / 2, 'fall_hostler');
  b.actor('gate_monger', 120.5, 102.4, Math.PI / 2, 'fall_trader');
  b.actor('gate_monger', 130.5, 106.4, Math.PI / 2, 'fall_trader');
  // The Rookery.
  b.actor('magpie_mab', 33.5, 24.4, Math.PI / 2, 'fall_magpie');
  b.actor('fence_calder', 38.5, 25.4, Math.PI / 2, 'fall_fence');
  b.actor('lookout_pike', 42.5, 28.5, Math.PI / 2, 'fall_lookout');

  // The crag pasture's rams — the city's only livestock, on purpose.
  b.npcSpawn('ram', 157, 49.5, 3, 3);

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
