import { Detail, Tile } from '@devcraft/shared';
import { AMBERFORD_RECT } from '../geography.js';
import { MARKET_STALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Amberford — the crossroads market town, the second hearth of the
 * Dawnlands. A waker graduates here off the First Road: the world's
 * first bank, the three trainer masters' workshops, the inn with a
 * fire always lit, and two gates pointing at two different futures —
 * the warm west road home, and the North Gate where the High Road
 * starts its long climb toward Silverfall.
 *
 * ARCHITECTURE LAW (the polish pass): every building here is BESPOKE.
 * No two homes share a floor plan; footprints are halls and wings,
 * not stamped rectangles; and the 45-degree wall tiles carry the
 * corners — the watch tower is a true octagon, the chapel apse is
 * faceted, the bank rounds its shoulders at the plaza. Diag mass
 * names the triangle that points INTO the building (a bottom-left
 * corner cut is mass NE), and every diagonal tile stays cardinally
 * braced by straight walls so rooms remain sealed.
 *
 * The zone stamps into AMBERFORD_RECT exactly (geography.test pins
 * it), and the gates meet the carved worldgen roads tile-for-tile:
 * the First Road enters the Fordgate at world (105,36) = local
 * (1,52); the High Road leaves the North Gate at world (158,-15) =
 * local (54,1).
 *
 * Anchors that must NOT move once the people pass lands (routine
 * offsets will hang off them): the Market Round and its well, the
 * bank counter, the three craft workshops and their stations, the
 * inn, the mill and docks, the chapel, every cottage door, and both
 * gates. Residents-to-be are noted on their buildings.
 */
export function buildAmberford(): ZoneDef {
  const R = AMBERFORD_RECT;
  const b = new ZoneBuilder('amberford', 'Amberford', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // The lanes — laid first so everything else shoulders up to them.
  // ---------------------------------------------------------------
  b.path({ x: 0, y: 52 }, { x: 20, y: 52 }, 3);
  b.path({ x: 20, y: 52 }, { x: 34, y: 46 }, 3);
  b.path({ x: 34, y: 46 }, { x: 46, y: 42 }, 3);
  b.path({ x: 54, y: 2 }, { x: 54, y: 20 }, 3);
  b.path({ x: 54, y: 20 }, { x: 52, y: 32 }, 3);
  b.path({ x: 52, y: 47 }, { x: 52, y: 68 }, 3);
  b.path({ x: 17, y: 8 }, { x: 54, y: 8 }, 2); // the craft lane
  b.path({ x: 34, y: 69 }, { x: 52, y: 69 }, 2); // the Commons walk
  b.path({ x: 60, y: 40 }, { x: 78, y: 38 }, 2); // the dock lane

  // ---------------------------------------------------------------
  // The Market Round — the town's stone heart: plaza, the old well,
  // stall canopies, and banners. Market mornings happen here.
  // ---------------------------------------------------------------
  b.fillEllipse(52, 40, 9, 7, Tile.StoneFloor);
  b.set(51, 39, Tile.WallStone).set(52, 39, Tile.WallStone); // the well
  b.set(51, 40, Tile.WallStone).set(52, 40, Tile.WallStone);
  b.stamp(MARKET_STALL, 36, 36);
  b.stamp(MARKET_STALL, 57, 33);
  b.stamp(MARKET_STALL, 42, 44);
  b.stamp(MARKET_STALL, 59, 44);
  b.set(42, 37, Tile.BannerPole).set(62, 37, Tile.BannerPole);
  b.set(43, 48, Tile.BannerPole).set(61, 48, Tile.BannerPole);
  b.set(46, 47, Tile.Bench).set(47, 47, Tile.Bench);
  b.set(40, 44, Tile.LampPost).set(63, 38, Tile.LampPost);
  b.set(44, 49, Tile.TreeOak);
  b.set(62, 33, Tile.TreeOak);

  // ---------------------------------------------------------------
  // The Bank of Amberford — a proper stone hall fronting the Round:
  // faceted shoulders, a walled vault wing, the teller line, and a
  // clerk's office in the east light. (Banker Cormund's post.)
  // ---------------------------------------------------------------
  b.fillRect(35, 24, 16, 11, Tile.StoneFloor);
  b.outlineRect(35, 24, 16, 11, Tile.WallStone);
  b.set(35, 34, Tile.WallStoneDiagNE); // south shoulders round to the plaza
  b.set(50, 34, Tile.WallStoneDiagNW);
  b.set(35, 24, Tile.WallStoneDiagSE); // and the crown facets to match
  b.set(50, 24, Tile.WallStoneDiagSW);
  b.set(42, 34, Tile.DoorwayStoneWide).set(43, 34, Tile.DoorwayStoneWide);
  b.set(39, 34, Tile.WallStoneWindow).set(46, 34, Tile.WallStoneWindow);
  b.set(39, 24, Tile.WallStoneWindow).set(46, 24, Tile.WallStoneWindow);
  b.set(50, 28, Tile.WallStoneWindow);
  // The vault wing: an inner wall, the armored boxes behind it.
  for (let y = 25; y <= 33; y++) b.set(38, y, Tile.WallStone);
  b.set(38, 29, Tile.DoorwayStone);
  b.set(36, 26, Tile.Vault).set(36, 30, Tile.Vault);
  b.set(37, 25, Tile.Cabinet);
  // The teller line, the banking floor, and the clerk's office.
  for (let x = 41; x <= 45; x++) b.set(x, 28, Tile.Counter);
  b.set(41, 31, Tile.BankChest).set(44, 31, Tile.BankChest);
  b.set(48, 26, Tile.Table).set(47, 26, Tile.Chair);
  b.set(49, 25, Tile.Bookshelf).set(49, 33, Tile.Cabinet);
  b.setDetail(42, 31, Detail.Rug).setDetail(43, 31, Detail.Rug);
  b.setDetail(42, 33, Detail.Doormat).setDetail(43, 33, Detail.Doormat);
  // The forecourt: a stone step down to the Round, lamps and boxes.
  b.fillRect(41, 35, 4, 2, Tile.StoneFloor);
  b.set(40, 35, Tile.LampPost).set(45, 35, Tile.LampPost);
  b.set(40, 36, Tile.FlowerBox).set(45, 36, Tile.FlowerBox);

  // ---------------------------------------------------------------
  // Craft Row — the masters' workshops along the craft lane, every
  // one its own building with its own habits.
  // ---------------------------------------------------------------
  // The smithy (Master Bretta Ironhewn): a stone forge hall with two
  // furnaces, paired anvils, and an open working yard out the south
  // side — coal smoke by day, quench-hiss by night.
  b.fillRect(14, 9, 14, 9, Tile.StoneFloor);
  b.outlineRect(14, 9, 14, 9, Tile.WallStone);
  b.set(14, 17, Tile.WallStoneDiagNE).set(27, 17, Tile.WallStoneDiagNW);
  b.set(19, 9, Tile.DoorwayStoneWide).set(20, 9, Tile.DoorwayStoneWide);
  b.set(16, 9, Tile.WallStoneWindow).set(24, 9, Tile.WallStoneWindow);
  b.set(18, 17, Tile.WallStoneWindow).set(23, 17, Tile.WallStoneWindow);
  b.set(15, 11, Tile.Furnace).set(15, 14, Tile.Furnace);
  b.set(19, 12, Tile.Anvil).set(22, 12, Tile.Anvil);
  b.set(26, 10, Tile.ToolRack);
  b.set(25, 15, Tile.Basin);
  b.set(18, 15, Tile.Counter).set(19, 15, Tile.Counter);
  b.set(16, 16, Tile.Barrel);
  b.setDetail(17, 12, Detail.Sawdust).setDetail(21, 13, Detail.Sawdust);
  b.setDetail(24, 11, Detail.Sawdust);
  b.setDetail(19, 10, Detail.Doormat).setDetail(20, 10, Detail.Doormat);
  // The forge yard: trampled dirt, the outdoor rack, delivery crates.
  b.fillRect(16, 18, 10, 3, Tile.Dirt);
  b.set(17, 19, Tile.WeaponRack);
  b.set(24, 19, Tile.Crate).set(25, 19, Tile.Barrel);
  b.setDetail(20, 19, Detail.Pebbles).setDetail(22, 18, Detail.Sawdust);
  // The artisan hall (Master Tilo): the town's shared workshop — a
  // long loom-and-carving hall with a fitting-room wing off the back,
  // and the tanning rack on its pad downwind.
  b.fillRect(30, 9, 16, 9, Tile.WoodFloor);
  b.outlineRect(30, 9, 16, 9, Tile.WallWood);
  b.set(36, 9, Tile.DoorwayWoodWide).set(37, 9, Tile.DoorwayWoodWide);
  b.set(32, 9, Tile.WallWoodWindow).set(42, 9, Tile.WallWoodWindow);
  b.set(30, 13, Tile.WallWoodWindow).set(45, 12, Tile.WallWoodWindow);
  b.set(32, 11, Tile.Loom);
  b.set(42, 11, Tile.CarvingBench);
  for (let x = 34; x <= 37; x++) b.set(x, 14, Tile.Counter);
  b.set(31, 15, Tile.Cabinet).set(44, 10, Tile.Cabinet);
  b.setDetail(33, 12, Detail.Sawdust).setDetail(41, 12, Detail.Sawdust);
  b.setDetail(36, 10, Detail.Doormat).setDetail(37, 10, Detail.Doormat);
  // The fitting-room wing (shared wall, its own quiet).
  b.fillRect(38, 17, 8, 6, Tile.WoodFloor);
  b.outlineRect(38, 17, 8, 6, Tile.WallWood);
  b.set(41, 17, Tile.DoorwayWood); // through the shared wall
  b.set(45, 19, Tile.WallWoodWindow).set(41, 22, Tile.WallWoodWindow);
  b.set(39, 18, Tile.Bookshelf).set(44, 18, Tile.Cabinet);
  b.set(41, 20, Tile.Table).set(42, 20, Tile.Chair);
  b.setDetail(41, 19, Detail.RugRound);
  // The tanning pad, downwind off the east gable.
  b.fillRect(47, 11, 3, 3, Tile.Dirt);
  b.set(48, 12, Tile.TanningRack);
  b.set(47, 14, Tile.Barrel);
  // The sage's dispensary (Sage Elowen): alembic in the north light,
  // a bed behind the shop, faceted corners toward her garden — and
  // the garden itself, fenced and worked in rows.
  b.fillRect(58, 12, 12, 10, Tile.WoodFloor);
  b.outlineRect(58, 12, 12, 10, Tile.WallWood);
  b.set(69, 12, Tile.WallWoodDiagSW).set(69, 21, Tile.WallWoodDiagNW);
  b.set(58, 16, Tile.DoorwayWood);
  b.set(58, 19, Tile.WallWoodWindow).set(62, 12, Tile.WallWoodWindow);
  b.set(63, 21, Tile.WallWoodWindow).set(69, 16, Tile.WallWoodWindow);
  b.set(65, 14, Tile.Alembic);
  b.set(61, 16, Tile.Counter).set(62, 16, Tile.Counter);
  b.set(67, 13, Tile.Bookshelf).set(59, 13, Tile.Cabinet);
  b.set(59, 20, Tile.Bed);
  b.set(64, 19, Tile.Table).set(65, 19, Tile.Chair);
  b.setDetail(62, 17, Detail.Rug).setDetail(59, 16, Detail.Doormat);
  b.set(56, 16, Tile.Dirt).set(57, 16, Tile.Dirt); // the worn step to the road
  b.outlineRect(71, 12, 9, 9, Tile.Fence);
  b.set(71, 16, Tile.Grass); // garden gate
  for (let x = 73; x <= 78; x += 1) {
    b.set(x, 14, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 16, x % 2 === 0 ? Tile.Tilled : Tile.SagewortMid);
    b.set(x, 18, x % 2 === 0 ? Tile.MoonbellMid : Tile.Tilled);
  }
  b.set(72, 13, Tile.WildSagewort).set(79, 19, Tile.WildMoonbell);

  // ---------------------------------------------------------------
  // The North Gate — where the High Road starts. The WATCH TOWER is
  // the west gatepost: a true octagon of stone, racks inside, the
  // warning board hung beside the arch. (Captain Aldis's command.)
  // ---------------------------------------------------------------
  b.fillRect(45, 1, 6, 6, Tile.StoneFloor);
  for (let x = 46; x <= 49; x++) b.set(x, 0, Tile.WallStone);
  for (let x = 46; x <= 49; x++) b.set(x, 7, Tile.WallStone);
  for (let y = 3; y <= 4; y++) b.set(44, y, Tile.WallStone);
  for (let y = 3; y <= 4; y++) b.set(51, y, Tile.WallStone);
  b.set(45, 1, Tile.WallStoneDiagSE).set(44, 2, Tile.WallStoneDiagSE);
  b.set(50, 1, Tile.WallStoneDiagSW).set(51, 2, Tile.WallStoneDiagSW);
  b.set(44, 5, Tile.WallStoneDiagNE).set(45, 6, Tile.WallStoneDiagNE);
  b.set(51, 5, Tile.WallStoneDiagNW).set(50, 6, Tile.WallStoneDiagNW);
  b.set(47, 7, Tile.DoorwayStone);
  b.set(47, 0, Tile.WallStoneWindow);
  b.set(44, 3, Tile.WallStoneWindow).set(51, 4, Tile.WallStoneWindow);
  b.set(46, 2, Tile.WeaponRack).set(48, 2, Tile.WeaponRack);
  b.set(49, 5, Tile.ToolRack);
  b.set(46, 4, Tile.Table).set(47, 4, Tile.Chair);
  b.set(45, 5, Tile.Barrel);
  b.setDetail(47, 6, Detail.Doormat);
  // The gate furniture: lamps where the lamplight ENDS, the sign that
  // tells you the truth, a rack for the watch's spare steel.
  b.set(52, 4, Tile.LampPost).set(56, 4, Tile.LampPost);
  b.set(56, 5, Tile.HangingSign); // "SILVERFALL — the High Road. Go armed."
  b.set(52, 6, Tile.WeaponRack);
  b.fillRect(53, 0, 3, 2, Tile.Path); // the mouth meets the carved High Road
  // The outfitter (Hask): packs, arrows, torches — the last shop
  // before the climb, its chamfered corner making the gate's east
  // post. Door on the road.
  b.fillRect(57, 2, 12, 9, Tile.WoodFloor);
  b.outlineRect(57, 2, 12, 9, Tile.WallWood);
  b.set(57, 2, Tile.WallWoodDiagSE).set(68, 10, Tile.WallWoodDiagNW);
  b.set(57, 6, Tile.DoorwayWood);
  b.set(57, 8, Tile.WallWoodWindow).set(61, 2, Tile.WallWoodWindow);
  b.set(64, 2, Tile.WallWoodWindow).set(63, 10, Tile.WallWoodWindow);
  b.set(58, 3, Tile.CrateGoods).set(59, 3, Tile.CrateGoods);
  b.set(63, 3, Tile.Bookshelf).set(64, 3, Tile.Cabinet);
  b.set(66, 4, Tile.WeaponRack).set(66, 6, Tile.ToolRack);
  for (let x = 59; x <= 61; x++) b.set(x, 7, Tile.Counter);
  b.set(67, 9, Tile.Barrel);
  b.setDetail(58, 6, Detail.Doormat).setDetail(60, 5, Detail.Rug);
  b.set(56, 6, Tile.Dirt); // the worn step between road and door

  // ---------------------------------------------------------------
  // The Wanderer's Rest — the inn (Dunna's house), grown into a
  // proper coaching house: hearth lounge, bar, kitchen, and a guest
  // wing of real rooms. The fire has not gone out in thirty years.
  // ---------------------------------------------------------------
  b.fillRect(54, 45, 16, 15, Tile.WoodFloor);
  b.outlineRect(54, 45, 16, 15, Tile.WallWood);
  b.set(54, 45, Tile.WallWoodDiagSE); // west shoulders soften the hall
  b.set(54, 59, Tile.WallWoodDiagNE);
  b.set(56, 45, Tile.DoorwayWoodWide).set(57, 45, Tile.DoorwayWoodWide);
  b.set(61, 45, Tile.WallWoodWindow).set(66, 45, Tile.WallWoodWindow);
  b.set(54, 50, Tile.WallWoodWindow).set(54, 54, Tile.WallWoodWindow);
  b.set(58, 59, Tile.WallWoodWindow).set(66, 59, Tile.WallWoodWindow);
  // The guest wing: two rooms off the east wall, doors from the hall.
  for (let y = 46; y <= 52; y++) b.set(63, y, Tile.WallWood);
  for (let x = 64; x <= 68; x++) b.set(x, 49, Tile.WallWood);
  b.set(63, 47, Tile.DoorwayWood).set(63, 51, Tile.DoorwayWood);
  b.set(68, 46, Tile.Bed).set(64, 46, Tile.Cabinet);
  b.set(68, 50, Tile.Bed).set(64, 52, Tile.Cabinet);
  // The kitchen, behind its own wall at the south-east.
  for (let x = 61; x <= 68; x++) b.set(x, 54, Tile.WallWood);
  for (let y = 55; y <= 58; y++) b.set(61, y, Tile.WallWood);
  b.set(64, 54, Tile.DoorwayWood);
  b.set(62, 55, Tile.Hearth);
  b.set(65, 58, Tile.Counter).set(66, 58, Tile.Counter);
  b.set(68, 55, Tile.Barrel).set(68, 57, Tile.Crate);
  // The lounge: the everlasting fire, table clusters, the long bar.
  b.set(55, 47, Tile.Hearth);
  b.set(57, 50, Tile.Table).set(58, 50, Tile.Table);
  b.set(56, 50, Tile.Chair).set(59, 50, Tile.Chair);
  b.set(57, 53, Tile.Table).set(56, 53, Tile.Chair);
  for (let x = 56; x <= 59; x++) b.set(x, 56, Tile.Counter);
  b.set(55, 58, Tile.Barrel).set(60, 58, Tile.Barrel);
  b.setDetail(58, 51, Detail.Rug).setDetail(59, 52, Detail.Rug);
  b.setDetail(56, 46, Detail.Doormat).setDetail(57, 46, Detail.Doormat);
  b.setDetail(66, 47, Detail.RugRound).setDetail(66, 51, Detail.RugRound);
  // Inn yard: the lamp by the door, cellar barrels along the gable.
  b.set(55, 43, Tile.LampPost);
  b.set(70, 55, Tile.Barrel).set(70, 56, Tile.Barrel).set(70, 57, Tile.Crate);
  b.set(59, 44, Tile.FlowerBox).set(64, 44, Tile.FlowerBox);

  // ---------------------------------------------------------------
  // The millpond, the mill, and the docks — the Amber Water.
  // ---------------------------------------------------------------
  b.fillEllipse(90, 36, 9, 12, Tile.WaterShallow);
  b.fillEllipse(90, 36, 7.5, 10.5, Tile.Water);
  b.fillEllipse(90, 36, 5, 7, Tile.WaterDeep);
  for (let y = 46; y <= 72; y++) {
    const cx = 90 + Math.round(Math.sin(y * 0.18) * 2.5);
    b.set(cx - 1, y, Tile.WaterShallow);
    b.set(cx, y, Tile.Water);
    b.set(cx + 1, y, Tile.WaterShallow);
  }
  b.fillEllipse(91, 74, 5, 4, Tile.Swamp);
  b.fillEllipse(91, 74, 3, 2, Tile.WaterShallow);
  // The mill (Old Garton's): a tall wooden works hard on the west
  // bank, corners faceted toward the water, flour on everything.
  b.fillRect(70, 24, 11, 10, Tile.WoodFloor);
  b.outlineRect(70, 24, 11, 10, Tile.WallWood);
  b.set(80, 24, Tile.WallWoodDiagSW).set(80, 33, Tile.WallWoodDiagNW);
  b.set(70, 28, Tile.DoorwayWood);
  b.set(70, 25, Tile.WallWoodWindow).set(74, 24, Tile.WallWoodWindow);
  b.set(75, 33, Tile.WallWoodWindow).set(80, 29, Tile.WallWoodWindow);
  b.set(76, 27, Tile.Workbench); // the millstone's stand-in station
  b.set(72, 31, Tile.Counter).set(73, 31, Tile.Counter);
  b.set(71, 25, Tile.CrateGoods).set(72, 25, Tile.CrateGoods);
  b.set(78, 25, Tile.Crate).set(78, 31, Tile.Barrel).set(79, 31, Tile.Barrel);
  b.setDetail(74, 29, Detail.Straw).setDetail(77, 28, Detail.Straw);
  b.setDetail(75, 27, Detail.Sawdust).setDetail(71, 28, Detail.Doormat);
  // The docks, the ferry shack (Peld's), the leaning willows.
  for (let x = 81; x <= 85; x++) {
    b.set(x, 38, Tile.Bridge);
    b.set(x, 39, Tile.Bridge);
  }
  b.set(86, 40, Tile.FishingSpot);
  b.set(94, 29, Tile.FishingSpot);
  b.fillRect(78, 46, 5, 4, Tile.WoodFloor);
  b.outlineRect(78, 46, 5, 4, Tile.WallWood);
  b.set(80, 46, Tile.DoorwayWood);
  b.set(83, 48, Tile.LampPost);
  b.set(77, 49, Tile.Crate);
  b.set(80, 41, Tile.Barrel);
  b.set(97, 27, Tile.TreeWillow);
  b.set(99, 41, Tile.TreeWillow);
  b.set(95, 47, Tile.TreeWillow);

  // ---------------------------------------------------------------
  // The East Road stub — signed, walked, and unfinished: the map
  // admitting there is more world than road. (Saltmere, someday.)
  // ---------------------------------------------------------------
  b.path({ x: 52, y: 61 }, { x: 111, y: 61 }, 2);
  for (let y = 60; y <= 61; y++) {
    const cx = 90 + Math.round(Math.sin(y * 0.18) * 2.5);
    for (let x = cx - 2; x <= cx + 2; x++) b.set(x, y, Tile.Bridge);
  }
  b.set(105, 58, Tile.HangingSign); // "EAST ROAD — the coast, eventually."

  // ---------------------------------------------------------------
  // The Waykeepers' Hall — the travelers' chapel, rebuilt in earnest:
  // a long stone nave with a FACETED APSE at the north end, pew rows
  // to either side of the aisle, lamps lit for the road. (Ansel's.)
  // ---------------------------------------------------------------
  b.fillRect(38, 52, 12, 16, Tile.StoneFloor);
  b.outlineRect(38, 52, 12, 16, Tile.WallStone);
  // The apse: two-step chamfers facet the north corners.
  b.set(38, 52, Tile.Grass).set(39, 52, Tile.Grass).set(38, 53, Tile.Grass);
  b.set(49, 52, Tile.Grass).set(48, 52, Tile.Grass).set(49, 53, Tile.Grass);
  b.set(39, 53, Tile.WallStoneDiagSE).set(38, 54, Tile.WallStoneDiagSE);
  b.set(48, 53, Tile.WallStoneDiagSW).set(49, 54, Tile.WallStoneDiagSW);
  b.set(42, 67, Tile.DoorwayStoneWide).set(43, 67, Tile.DoorwayStoneWide);
  b.set(38, 58, Tile.WallStoneWindow).set(38, 62, Tile.WallStoneWindow);
  b.set(49, 58, Tile.WallStoneWindow).set(49, 62, Tile.WallStoneWindow);
  b.set(46, 67, Tile.WallStoneWindow);
  b.set(43, 54, Tile.Lectern);
  b.setDetail(43, 55, Detail.RugRound);
  // Pews flank the aisle; adjacent benches merge into full rows.
  for (const y of [58, 61, 64]) {
    b.set(40, y, Tile.Bench).set(41, y, Tile.Bench);
    b.set(46, y, Tile.Bench).set(47, y, Tile.Bench);
  }
  b.set(48, 66, Tile.Bookshelf);
  b.setDetail(42, 66, Detail.Doormat).setDetail(43, 66, Detail.Doormat);
  b.set(40, 68, Tile.LampPost).set(46, 68, Tile.LampPost);
  b.set(37, 56, Tile.FlowerBox);

  // ---------------------------------------------------------------
  // The Commons — five homes and not one floor plan shared: the
  // grocer's cozy gable, the banker's house with his office nook,
  // the woodworker's tall workshop-home, the orchardist's cottage
  // among her berries, and the captain's stone house by the south
  // road. Wear-paths run where feet actually go.
  // ---------------------------------------------------------------
  // Merra the grocer's — small, warm, stock stacked by the door.
  b.fillRect(17, 54, 8, 6, Tile.WoodFloor);
  b.outlineRect(17, 54, 8, 6, Tile.WallWood);
  b.set(20, 59, Tile.DoorwayWood);
  b.set(18, 54, Tile.WallWoodWindow).set(22, 54, Tile.WallWoodWindow);
  b.set(24, 56, Tile.WallWoodWindow);
  b.set(18, 55, Tile.Bed);
  b.set(23, 55, Tile.Cabinet);
  b.set(20, 57, Tile.Table).set(21, 57, Tile.Chair);
  b.set(19, 58, Tile.CrateGoods);
  b.setDetail(20, 58, Detail.Doormat).setDetail(21, 56, Detail.Rug);
  b.set(16, 56, Tile.Bench);
  // Cormund the banker's — a wide house, door east, ledgers at home.
  b.fillRect(18, 62, 9, 7, Tile.WoodFloor);
  b.outlineRect(18, 62, 9, 7, Tile.WallWood);
  b.set(26, 65, Tile.DoorwayWood);
  b.set(21, 62, Tile.WallWoodWindow).set(18, 65, Tile.WallWoodWindow);
  b.set(22, 68, Tile.WallWoodWindow);
  b.set(19, 63, Tile.Bed);
  b.set(23, 63, Tile.Table).set(23, 64, Tile.Chair);
  b.set(25, 63, Tile.Bookshelf).set(19, 67, Tile.Cabinet);
  b.setDetail(22, 65, Detail.Rug).setDetail(25, 65, Detail.Doormat);
  // Master Tilo's — tall and shavings-scented even at home.
  b.fillRect(28, 60, 8, 8, Tile.WoodFloor);
  b.outlineRect(28, 60, 8, 8, Tile.WallWood);
  b.set(31, 67, Tile.DoorwayWood);
  b.set(30, 60, Tile.WallWoodWindow).set(33, 60, Tile.WallWoodWindow);
  b.set(35, 63, Tile.WallWoodWindow);
  b.set(29, 61, Tile.Bed);
  b.set(34, 61, Tile.Crate);
  b.set(31, 63, Tile.Table).set(32, 63, Tile.Chair);
  b.set(29, 66, Tile.Cabinet).set(34, 66, Tile.Bookshelf);
  b.setDetail(32, 62, Detail.Sawdust).setDetail(31, 66, Detail.Doormat);
  // Goodwife Perl's — the orchard cottage, berries at the step.
  b.fillRect(33, 71, 8, 6, Tile.WoodFloor);
  b.outlineRect(33, 71, 8, 6, Tile.WallWood);
  b.set(36, 71, Tile.DoorwayWood);
  b.set(38, 71, Tile.WallWoodWindow).set(33, 73, Tile.WallWoodWindow);
  b.set(40, 74, Tile.WallWoodWindow);
  b.set(39, 72, Tile.Bed);
  b.set(34, 72, Tile.Cabinet);
  b.set(35, 74, Tile.Table).set(36, 74, Tile.Chair);
  b.setDetail(36, 72, Detail.Doormat).setDetail(37, 74, Detail.RugRound);
  b.set(32, 70, Tile.BerryBush).set(41, 72, Tile.BerryBush);
  b.set(38, 70, Tile.FlowerBox);
  // Captain Aldis's — stone, spare, corners cut like her tower.
  b.fillRect(56, 64, 7, 7, Tile.StoneFloor);
  b.outlineRect(56, 64, 7, 7, Tile.WallStone);
  b.set(62, 64, Tile.WallStoneDiagSW).set(62, 70, Tile.WallStoneDiagNW);
  b.set(56, 67, Tile.DoorwayStone);
  b.set(59, 64, Tile.WallStoneWindow).set(59, 70, Tile.WallStoneWindow);
  b.set(57, 65, Tile.Bed);
  b.set(61, 65, Tile.WeaponRack);
  b.set(59, 67, Tile.Table).set(58, 68, Tile.Chair);
  b.set(61, 69, Tile.Cabinet);
  b.setDetail(57, 67, Detail.Doormat);
  b.set(55, 67, Tile.Dirt); // her step to the south road
  // Commons dressing: garden plots, the bench, the lamp, the wear.
  b.fillRect(19, 60, 3, 2, Tile.Tilled);
  b.set(19, 60, Tile.CarrotMid).set(21, 61, Tile.CarrotRipe);
  b.fillRect(29, 57, 3, 2, Tile.Tilled);
  b.set(29, 57, Tile.SunflowerMid).set(31, 58, Tile.SunflowerRipe);
  b.set(27, 58, Tile.LampPost);
  b.set(24, 70, Tile.Bench);
  b.set(20, 60, Tile.Dirt).set(20, 61, Tile.Dirt);
  b.set(27, 65, Tile.Dirt);
  b.set(31, 68, Tile.Dirt).set(32, 69, Tile.Dirt);
  b.set(36, 70, Tile.Dirt).set(36, 69, Tile.Dirt);

  // ---------------------------------------------------------------
  // Furrowfield farm — the fields, the coop, and a farmhouse grown
  // to fit the family that works them. (Jorel & Tamsin's.)
  // ---------------------------------------------------------------
  b.outlineRect(3, 36, 19, 12, Tile.Fence);
  b.set(21, 42, Tile.Grass); // field gate, east
  for (let y = 38; y <= 46; y += 2) {
    for (let x = 5; x <= 19; x++) {
      if (x % 2 === 0) {
        b.set(x, y, Tile.Tilled);
      } else if (y === 38) {
        b.set(x, y, Tile.WheatRipe);
      } else if (y === 40) {
        b.set(x, y, Tile.WheatMid);
      } else if (y === 42) {
        b.set(x, y, Tile.CarrotRipe);
      } else if (y === 44) {
        b.set(x, y, Tile.CottonMid);
      } else {
        b.set(x, y, Tile.SunflowerRipe);
      }
    }
  }
  // The farmhouse: a long hall with the hearth at the west gable.
  b.fillRect(6, 60, 11, 9, Tile.WoodFloor);
  b.outlineRect(6, 60, 11, 9, Tile.WallWood);
  b.set(6, 68, Tile.WallWoodDiagNE);
  b.set(10, 68, Tile.DoorwayWood);
  b.set(8, 60, Tile.WallWoodWindow).set(13, 60, Tile.WallWoodWindow);
  b.set(6, 64, Tile.WallWoodWindow).set(16, 63, Tile.WallWoodWindow);
  b.set(7, 61, Tile.Hearth);
  b.set(15, 61, Tile.Bed).set(15, 63, Tile.Bed);
  b.set(9, 64, Tile.Table).set(8, 64, Tile.Chair).set(10, 64, Tile.Chair);
  b.set(15, 66, Tile.Cabinet);
  b.setDetail(10, 63, Detail.Rug).setDetail(11, 63, Detail.Rug);
  b.setDetail(10, 67, Detail.Doormat);
  b.set(5, 69, Tile.Barrel).set(17, 62, Tile.Crate);
  b.set(7, 70, Tile.Bench);
  // The coop: fenced dirt and straw between road and farmhouse.
  b.fillRect(5, 56, 4, 3, Tile.Dirt);
  b.outlineRect(4, 55, 6, 5, Tile.Fence);
  b.set(9, 57, Tile.Dirt); // gate, east
  b.setDetail(6, 57, Detail.Straw).setDetail(7, 56, Detail.Straw);
  b.set(11, 54, Tile.Dirt).set(11, 55, Tile.Dirt).set(11, 56, Tile.Dirt);
  b.set(11, 57, Tile.Dirt).set(11, 58, Tile.Dirt).set(12, 59, Tile.Dirt);

  // ---------------------------------------------------------------
  // The pasture — the northeast grazing, trough by the west rail.
  // (Perl feuds with these cows. The cows are winning.)
  // ---------------------------------------------------------------
  b.outlineRect(70, 2, 24, 9, Tile.Fence);
  b.set(76, 10, Tile.Grass); // gate, south
  b.set(72, 4, Tile.Basin);
  b.setDetail(75, 5, Detail.Straw).setDetail(84, 7, Detail.Straw);
  b.setDetail(89, 4, Detail.Straw);

  // ---------------------------------------------------------------
  // The orchard — Perl's apple rows west of the stream.
  // ---------------------------------------------------------------
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      b.set(66 + col * 4 + (row % 2) * 2, 63 + row * 4, Tile.TreeOak);
    }
  }
  b.set(64, 64, Tile.BerryBush).set(64, 70, Tile.BerryBush);
  b.set(85, 64, Tile.BerryBush).set(86, 68, Tile.BerryBush);
  b.set(84, 71, Tile.FibrePlant);

  // ---------------------------------------------------------------
  // The Fordgate — the warm way home.
  // ---------------------------------------------------------------
  b.set(2, 50, Tile.PillarStone).set(2, 54, Tile.PillarStone);
  b.set(4, 49, Tile.LampPost).set(4, 55, Tile.LampPost);
  b.set(6, 49, Tile.HangingSign); // "DAWNMEAD — the First Road."
  b.set(12, 50, Tile.LampPost).set(26, 49, Tile.LampPost);

  // ---------------------------------------------------------------
  // Meadow life, then the town's soft edges.
  // ---------------------------------------------------------------
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.04);
  b.scatterDetail(Detail.Tuft, 0.06);
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 52) <= 4 && x < 10) continue; // Fordgate breathes
      if (Math.abs(x - 54) <= 4 && y < 10) continue; // North Gate breathes
      if (Math.abs(y - 60) <= 4 && x > 100) continue; // East stub breathes
      if (x >= 2 && x <= 23 && y >= 35 && y <= 49) continue; // fields
      if (x >= 69 && x <= 94 && y >= 1 && y <= 11) continue; // pasture
      if (x >= 14 && x <= 46 && y >= 68) continue; // the Commons' south yard
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.3 : edge < 7 ? 0.1 : 0;
      if (density > 0 && fordRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // ---------------------------------------------------------------
  // The animals — the town's working livestock.
  // ---------------------------------------------------------------
  b.npcSpawn('cow', 82, 6.5, 2.5, 3);
  b.npcSpawn('chicken', 6.5, 57.2, 1.4, 3);

  // Respawn hearth for the eastern lowlands: the Round, beside the well.
  b.spawn(52.5, 44.5);
  return b.build();
}

/** Stable per-tile randomness so the town is identical every boot. */
function fordRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
