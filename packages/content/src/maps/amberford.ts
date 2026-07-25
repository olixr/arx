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
 * THE TOWN-PLAN LAW (the second polish pass): Amberford is laid out
 * like a real town, not a diorama.
 *  - STREETS FIRST. A plain cross of spines — west road, north road,
 *    south lane, east stub — plus the craft lane and the dock lane.
 *    Every building FRONTS a street or the commons green, and no two
 *    structures stand closer than three open tiles unless a road runs
 *    between them (gateposts hug the gate on purpose).
 *  - A DIAGONAL BUDGET. 45-degree walls are statements, not texture:
 *    the watch tower's octagon, the chapel's faceted apse, the bank's
 *    two plaza shoulders, and Captain Aldis's house echoing her tower.
 *    Everything else is honest blocky rooms.
 *  - ROOM INTENT. Every interior room has ONE stated job and the
 *    furniture to prove it: shop floors put the counter facing the
 *    door with displays on the customer walls; workshops line their
 *    stations along a work wall; storerooms hold stock; bedrooms hold
 *    beds. Nothing is placed to fill space.
 *
 * The zone stamps into AMBERFORD_RECT exactly (geography.test pins
 * it), and the gates meet the carved worldgen roads tile-for-tile:
 * the First Road enters the Fordgate at world (105,36) = local
 * (1,52); the High Road leaves the North Gate at world (158,-15) =
 * local (54,1).
 *
 * Anchors that must NOT move once the people pass lands (routine
 * offsets will hang off them): the Market Round and its well, the
 * bank counter, the craft workshops and their stations, the inn, the
 * mill and docks, the chapel, every home's door, and both gates.
 * Residents-to-be are noted on their buildings.
 */
export function buildAmberford(): ZoneDef {
  const R = AMBERFORD_RECT;
  const b = new ZoneBuilder('amberford', 'Amberford', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // The streets — a legible cross, laid first so every building
  // shoulders up to a real address.
  // ---------------------------------------------------------------
  b.path({ x: 0, y: 52 }, { x: 52, y: 52 }, 3); // the west spine: Fordgate -> town
  b.path({ x: 54, y: 2 }, { x: 54, y: 33 }, 3); // the north spine: North Gate -> the Round
  b.path({ x: 52, y: 47 }, { x: 52, y: 68 }, 3); // the south lane: the Round -> the Commons
  b.path({ x: 12, y: 8 }, { x: 54, y: 8 }, 2); // the craft lane
  b.path({ x: 61, y: 39 }, { x: 80, y: 39 }, 2); // the dock lane: the Round -> the water

  // ---------------------------------------------------------------
  // The Market Round — the town's stone heart: the old well at the
  // center, stalls around the rim, banners and benches. Market
  // mornings happen here; the respawn hearth stands beside the well.
  // ---------------------------------------------------------------
  b.fillEllipse(52, 40, 9, 7, Tile.StoneFloor);
  b.set(51, 39, Tile.WallStone).set(52, 39, Tile.WallStone); // the well
  b.set(51, 40, Tile.WallStone).set(52, 40, Tile.WallStone);
  // Stalls face the plaza from its grass aprons — north pair for the
  // road trade, southwest for the Commons, east for the fish cart.
  b.stamp(MARKET_STALL, 45, 32);
  b.stamp(MARKET_STALL, 57, 32);
  b.stamp(MARKET_STALL, 45, 47);
  b.stamp(MARKET_STALL, 60, 35);
  b.set(48, 34, Tile.BannerPole).set(56, 34, Tile.BannerPole);
  b.set(48, 45, Tile.Bench).set(55, 45, Tile.Bench);
  b.set(46, 49, Tile.LampPost).set(58, 48, Tile.LampPost);
  b.set(43, 49, Tile.TreeOak); // the market oak, shade for the southwest corner

  // ---------------------------------------------------------------
  // The Bank of Amberford — a stone hall fronting the Round with its
  // two plaza shoulders faceted (the diagonal budget's third entry).
  // Inside: a public lobby, the teller line, the staff floor, the
  // manager's office, and a windowless vault room. (Cormund's post.)
  // ---------------------------------------------------------------
  b.fillRect(33, 24, 16, 12, Tile.StoneFloor);
  b.outlineRect(33, 24, 16, 12, Tile.WallStone);
  b.set(33, 35, Tile.WallStoneDiagNE); // the shoulders round to the plaza
  b.set(48, 35, Tile.WallStoneDiagNW);
  b.set(40, 35, Tile.DoorwayStoneWide).set(41, 35, Tile.DoorwayStoneWide);
  b.set(36, 35, Tile.WallStoneWindow).set(45, 35, Tile.WallStoneWindow);
  b.set(39, 24, Tile.WallStoneWindow).set(46, 24, Tile.WallStoneWindow);
  b.set(48, 26, Tile.WallStoneWindow).set(48, 32, Tile.WallStoneWindow);
  // The vault room: an inner wall, no windows — coin sleeps in the dark.
  for (let y = 25; y <= 34; y++) b.set(37, y, Tile.WallStone);
  b.set(37, 28, Tile.DoorwayStone);
  b.set(34, 25, Tile.Vault).set(34, 28, Tile.Vault).set(34, 31, Tile.Vault);
  b.set(36, 25, Tile.Cabinet);
  b.set(35, 33, Tile.CrateGoods);
  // The manager's office, walled into the northeast light.
  b.set(44, 25, Tile.WallStone).set(44, 27, Tile.WallStone);
  b.set(44, 26, Tile.DoorwayStone);
  for (let x = 45; x <= 47; x++) b.set(x, 28, Tile.WallStone);
  b.set(47, 25, Tile.Bookshelf);
  b.set(46, 26, Tile.Table).set(45, 26, Tile.Chair);
  b.setDetail(46, 27, Detail.RugRound);
  // The teller line and the staff floor behind it.
  for (let x = 38; x <= 43; x++) b.set(x, 29, Tile.Counter);
  b.set(41, 25, Tile.Bookshelf).set(42, 25, Tile.Bookshelf); // the ledger wall
  b.set(39, 26, Tile.Table).set(39, 27, Tile.Chair);
  // The lobby: the two banking chests flank the rug aisle; a bench
  // for the queue on market days.
  b.set(38, 32, Tile.BankChest).set(43, 32, Tile.BankChest);
  b.set(45, 33, Tile.Bench).set(46, 33, Tile.Bench);
  b.setDetail(40, 32, Detail.Rug).setDetail(41, 32, Detail.Rug);
  b.setDetail(40, 33, Detail.Rug).setDetail(41, 33, Detail.Rug);
  b.setDetail(40, 34, Detail.Doormat).setDetail(41, 34, Detail.Doormat);
  // The forecourt: a stone step down, lamps, and a walk to the Round.
  b.fillRect(39, 36, 4, 2, Tile.StoneFloor);
  b.path({ x: 41, y: 38 }, { x: 46, y: 39 }, 2, Tile.StoneFloor);
  b.set(38, 36, Tile.LampPost).set(43, 36, Tile.LampPost);

  // ---------------------------------------------------------------
  // Craft Row — the masters' workshops down the craft lane, each a
  // real workplace: forge hall and commission shop for the smith, a
  // long work line and a cloth shop for the artisan.
  // ---------------------------------------------------------------
  // The smithy (Master Bretta Ironhewn): the forge hall takes the
  // west half — furnaces on the wall, paired anvils, the quench
  // basin — and the commission shop takes the east, counter facing
  // its own door. The working yard sprawls south, coal and cinders.
  b.fillRect(10, 10, 16, 11, Tile.StoneFloor);
  b.outlineRect(10, 10, 16, 11, Tile.WallStone);
  b.set(14, 10, Tile.DoorwayStoneWide).set(15, 10, Tile.DoorwayStoneWide); // forge door
  b.set(21, 10, Tile.DoorwayStone); // shop door
  b.set(12, 10, Tile.WallStoneWindow).set(23, 10, Tile.WallStoneWindow);
  b.set(10, 14, Tile.WallStoneWindow).set(25, 14, Tile.WallStoneWindow);
  b.set(13, 20, Tile.WallStoneWindow).set(22, 20, Tile.WallStoneWindow);
  for (let y = 11; y <= 19; y++) b.set(18, y, Tile.WallStone);
  b.set(18, 15, Tile.DoorwayStone); // hall <-> shop
  // The forge hall.
  b.set(11, 12, Tile.Furnace).set(11, 15, Tile.Furnace);
  b.set(14, 13, Tile.Anvil).set(14, 16, Tile.Anvil);
  b.set(16, 11, Tile.ToolRack);
  b.set(16, 18, Tile.Basin); // the quench
  b.set(11, 18, Tile.Crate).set(11, 19, Tile.Barrel); // the coal store
  b.setDetail(13, 14, Detail.Pebbles).setDetail(15, 17, Detail.Pebbles);
  b.setDetail(14, 11, Detail.Doormat).setDetail(15, 11, Detail.Doormat);
  // The commission shop: counter facing the door, work on the walls.
  for (let x = 20; x <= 22; x++) b.set(x, 13, Tile.Counter);
  b.set(24, 11, Tile.Cabinet).set(24, 13, Tile.WeaponRack);
  b.set(19, 18, Tile.Crate).set(24, 17, Tile.CrateGoods);
  b.setDetail(21, 11, Detail.Doormat);
  // The forge yard: trampled dirt, the outdoor rack, the deliveries.
  b.fillRect(11, 21, 14, 4, Tile.Dirt);
  b.set(13, 22, Tile.WeaponRack);
  b.set(17, 22, Tile.Basin); // the slack trough
  b.set(22, 22, Tile.Crate).set(23, 23, Tile.Barrel);
  b.setDetail(15, 23, Detail.Pebbles).setDetail(20, 22, Detail.Pebbles);
  b.set(23, 9, Tile.HangingSign); // "IRONHEWN — smithing, shoeing, sharpening."
  b.set(14, 9, Tile.Dirt).set(15, 9, Tile.Dirt).set(21, 9, Tile.Dirt);
  // The artisan hall (Master Tilo): a cloth-and-carving shop up
  // front — counter, pattern books, bolts on display — and the work
  // line across the back: loom, carving bench, workbench in a row.
  // The tanning rack keeps its smell outside, downwind on the east.
  b.fillRect(32, 10, 16, 10, Tile.WoodFloor);
  b.outlineRect(32, 10, 16, 10, Tile.WallWood);
  b.set(38, 10, Tile.DoorwayWoodWide).set(39, 10, Tile.DoorwayWoodWide);
  b.set(34, 10, Tile.WallWoodWindow).set(43, 10, Tile.WallWoodWindow);
  b.set(32, 13, Tile.WallWoodWindow).set(47, 12, Tile.WallWoodWindow);
  b.set(36, 19, Tile.WallWoodWindow).set(43, 19, Tile.WallWoodWindow);
  for (let x = 33; x <= 46; x++) b.set(x, 15, Tile.WallWood);
  b.set(39, 15, Tile.DoorwayWood); // shop <-> workshop
  // The shop floor.
  for (let x = 35; x <= 38; x++) b.set(x, 13, Tile.Counter);
  b.set(33, 11, Tile.Bookshelf).set(34, 11, Tile.Cabinet); // the pattern books
  b.set(44, 11, Tile.Cabinet).set(45, 12, Tile.CrateGoods); // bolts and thread
  b.setDetail(42, 12, Detail.RugRound);
  b.setDetail(38, 11, Detail.Doormat).setDetail(39, 11, Detail.Doormat);
  // The work line.
  b.set(34, 17, Tile.Loom);
  b.set(38, 17, Tile.CarvingBench);
  b.set(42, 17, Tile.Workbench);
  b.set(45, 16, Tile.Crate).set(45, 18, Tile.Barrel);
  b.setDetail(36, 16, Detail.Sawdust).setDetail(41, 16, Detail.Sawdust);
  b.set(36, 9, Tile.HangingSign); // "TILO'S — cloth, carving, commissions."
  b.set(38, 9, Tile.Dirt).set(39, 9, Tile.Dirt);
  // The tanning pad, downwind off the east gable.
  b.fillRect(49, 12, 3, 3, Tile.Dirt);
  b.set(50, 13, Tile.TanningRack);
  b.set(49, 14, Tile.Barrel);

  // ---------------------------------------------------------------
  // The North Gate — where the High Road starts. The WATCH TOWER is
  // the west gatepost: a true octagon of stone, racks and the duty
  // table inside, the warning board hung where the lamplight ends.
  // (Captain Aldis's command.)
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
  b.set(45, 5, Tile.Brazier); // the watch fire
  b.setDetail(47, 6, Detail.Doormat);
  // The gate furniture: lamps where the lamplight ENDS, the sign that
  // tells you the truth, a rack for the watch's spare steel.
  b.set(52, 4, Tile.LampPost).set(56, 4, Tile.LampPost);
  b.set(56, 5, Tile.HangingSign); // "SILVERFALL — the High Road. Go armed."
  b.set(52, 6, Tile.WeaponRack);
  b.fillRect(53, 0, 3, 2, Tile.Path); // the mouth meets the carved High Road
  // The outfitter (Hask), the gate's east post: the last shop before
  // the climb. Shop floor by the road — packs stacked, bows racked,
  // counter facing the door — and the storeroom walled off east.
  b.fillRect(58, 2, 12, 10, Tile.WoodFloor);
  b.outlineRect(58, 2, 12, 10, Tile.WallWood);
  b.set(58, 6, Tile.DoorwayWood); // door on the road
  b.set(58, 4, Tile.WallWoodWindow).set(58, 9, Tile.WallWoodWindow);
  b.set(61, 2, Tile.WallWoodWindow).set(69, 7, Tile.WallWoodWindow);
  b.set(61, 11, Tile.WallWoodWindow).set(66, 11, Tile.WallWoodWindow);
  for (let y = 3; y <= 10; y++) b.set(65, y, Tile.WallWood);
  b.set(65, 6, Tile.DoorwayWood); // shop <-> store
  // The shop floor.
  for (let y = 5; y <= 7; y++) b.set(62, y, Tile.Counter);
  b.set(59, 3, Tile.CrateGoods).set(60, 3, Tile.Cabinet); // the pack wall
  b.set(63, 3, Tile.WeaponRack); // bows and arrows
  b.set(63, 10, Tile.ToolRack); // torches, rope, spades
  b.set(59, 9, Tile.Barrel); // pitch for the torches
  b.setDetail(59, 6, Detail.Doormat).setDetail(60, 5, Detail.Rug);
  // The storeroom.
  b.set(66, 3, Tile.Crate).set(67, 3, Tile.CrateGoods).set(68, 4, Tile.Crate);
  b.set(66, 10, Tile.Barrel).set(67, 10, Tile.Barrel);
  b.setDetail(67, 6, Detail.Straw);
  b.set(57, 4, Tile.HangingSign); // "HASK'S OUTFITTING — last chance."
  b.set(56, 6, Tile.Dirt).set(57, 6, Tile.Dirt); // the worn step to the road

  // ---------------------------------------------------------------
  // The sage's dispensary (Sage Elowen) — off the north spine with a
  // worn footpath to her door: the remedy shop up front, the alembic
  // lab in the north light, her small bedroom behind it, and the
  // fenced herb garden worked in rows outside.
  // ---------------------------------------------------------------
  b.fillRect(61, 15, 11, 10, Tile.WoodFloor);
  b.outlineRect(61, 15, 11, 10, Tile.WallWood);
  b.set(61, 19, Tile.DoorwayWood); // door faces the spine
  b.set(61, 17, Tile.WallWoodWindow).set(61, 22, Tile.WallWoodWindow);
  b.set(64, 15, Tile.WallWoodWindow).set(68, 15, Tile.WallWoodWindow);
  b.set(71, 18, Tile.WallWoodWindow).set(64, 24, Tile.WallWoodWindow);
  for (let y = 16; y <= 23; y++) b.set(66, y, Tile.WallWood);
  b.set(66, 19, Tile.DoorwayWood); // shop <-> the back rooms
  for (let x = 67; x <= 70; x++) b.set(x, 20, Tile.WallWood);
  b.set(68, 20, Tile.DoorwayWood); // lab <-> bedroom
  // The remedy shop: counter by the door, the pharmacopoeia north.
  for (let y = 17; y <= 19; y++) b.set(64, y, Tile.Counter);
  b.set(62, 16, Tile.Bookshelf).set(63, 16, Tile.Cabinet);
  b.set(63, 22, Tile.Table).set(63, 21, Tile.Chair); // where she hears symptoms
  b.setDetail(62, 19, Detail.Doormat).setDetail(63, 20, Detail.RugRound);
  // The alembic lab, then her room behind it.
  b.set(68, 16, Tile.Alembic);
  b.set(70, 17, Tile.Basin);
  b.set(70, 19, Tile.Bookshelf);
  b.setDetail(67, 18, Detail.Straw); // herbs drying on the floor
  b.set(70, 21, Tile.Bed);
  b.set(67, 23, Tile.Cabinet);
  b.setDetail(68, 22, Detail.RugRound);
  // The herb garden, fenced and worked in rows.
  b.outlineRect(74, 15, 9, 8, Tile.Fence);
  b.set(74, 19, Tile.Dirt); // the garden gate
  for (let x = 76; x <= 81; x += 1) {
    b.set(x, 17, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 19, x % 2 === 0 ? Tile.Tilled : Tile.SagewortMid);
    b.set(x, 21, x % 2 === 0 ? Tile.MoonbellMid : Tile.Tilled);
  }
  b.set(75, 21, Tile.WildSagewort).set(81, 16, Tile.WildMoonbell);
  b.set(60, 17, Tile.HangingSign); // "ELOWEN — remedies, salves, sense."
  b.set(60, 21, Tile.LampPost);
  for (let x = 57; x <= 60; x++) b.set(x, 19, Tile.Dirt); // her footpath

  // ---------------------------------------------------------------
  // The Wanderer's Rest (Dunna's) — the coaching inn FRONTS THE
  // ROUND, double doors on the plaza: the hearth room and tables,
  // the long bar with the cellar nook behind it (Dunna's cot in the
  // corner — she sleeps where the barrels are), the kitchen walled
  // off southeast, and two real guest rooms in the east wing.
  // ---------------------------------------------------------------
  b.fillRect(60, 44, 15, 14, Tile.WoodFloor);
  b.outlineRect(60, 44, 15, 14, Tile.WallWood);
  b.set(63, 44, Tile.DoorwayWoodWide).set(64, 44, Tile.DoorwayWoodWide);
  b.set(67, 44, Tile.WallWoodWindow).set(71, 44, Tile.WallWoodWindow);
  b.set(60, 47, Tile.WallWoodWindow).set(60, 51, Tile.WallWoodWindow).set(60, 55, Tile.WallWoodWindow);
  b.set(66, 57, Tile.WallWoodWindow).set(71, 57, Tile.WallWoodWindow);
  b.set(74, 46, Tile.WallWoodWindow).set(74, 53, Tile.WallWoodWindow);
  // The guest wing: a corridor wall and two rooms with real doors.
  for (let y = 45; y <= 51; y++) b.set(69, y, Tile.WallWood);
  b.set(69, 46, Tile.DoorwayWood).set(69, 50, Tile.DoorwayWood);
  for (let x = 70; x <= 73; x++) b.set(x, 48, Tile.WallWood);
  b.set(73, 45, Tile.Bed).set(70, 47, Tile.Cabinet);
  b.setDetail(71, 46, Detail.RugRound);
  b.set(73, 51, Tile.Bed).set(70, 49, Tile.Cabinet);
  b.setDetail(71, 50, Detail.RugRound);
  // The kitchen, walled off southeast; the bar and cellar nook west.
  for (let x = 65; x <= 73; x++) b.set(x, 52, Tile.WallWood);
  b.set(68, 52, Tile.DoorwayWood);
  for (let y = 53; y <= 56; y++) b.set(65, y, Tile.WallWood);
  b.set(73, 53, Tile.Hearth); // the cook fire
  b.set(66, 53, Tile.Basin);
  b.set(69, 56, Tile.Counter).set(70, 56, Tile.Counter);
  b.set(66, 55, Tile.CrateGoods).set(72, 56, Tile.Crate);
  // The bar, and Dunna's nook behind it.
  for (let x = 61; x <= 63; x++) b.set(x, 52, Tile.Counter);
  b.set(61, 53, Tile.Barrel).set(62, 53, Tile.Barrel);
  b.set(61, 56, Tile.Bed).set(63, 56, Tile.Cabinet);
  b.setDetail(62, 55, Detail.RugRound);
  // The hearth room: the everlasting fire and the table clusters.
  b.set(61, 45, Tile.Hearth);
  b.set(63, 48, Tile.Table).set(62, 48, Tile.Chair).set(64, 48, Tile.Chair);
  b.set(66, 46, Tile.Table).set(66, 47, Tile.Chair);
  b.setDetail(62, 46, Detail.Rug).setDetail(63, 46, Detail.Rug);
  b.setDetail(63, 45, Detail.Doormat).setDetail(64, 45, Detail.Doormat);
  // The inn yard: sign and lamp at the plaza door, the travelers'
  // bench on the lane side, the cellar deliveries along the gable.
  b.set(61, 43, Tile.HangingSign); // "THE WANDERER'S REST — beds, board, news."
  b.set(66, 43, Tile.LampPost);
  b.set(70, 43, Tile.FlowerBox);
  b.set(63, 43, Tile.Dirt).set(64, 43, Tile.Dirt);
  b.set(59, 49, Tile.Bench);
  b.set(75, 54, Tile.Barrel).set(75, 55, Tile.Barrel).set(75, 56, Tile.Crate);

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
  // The mill (Old Garton's): hard on the west bank with its door on
  // the dock lane. The milling floor takes the north half — the
  // stone, the grain sacks, straw on everything — and the flour
  // shop the south, counter facing the lane.
  b.fillRect(70, 28, 11, 10, Tile.WoodFloor);
  b.outlineRect(70, 28, 11, 10, Tile.WallWood);
  b.set(74, 37, Tile.DoorwayWood); // door on the dock lane
  b.set(74, 28, Tile.WallWoodWindow).set(77, 28, Tile.WallWoodWindow);
  b.set(70, 31, Tile.WallWoodWindow).set(70, 35, Tile.WallWoodWindow);
  b.set(80, 30, Tile.WallWoodWindow).set(80, 34, Tile.WallWoodWindow);
  b.set(77, 37, Tile.WallWoodWindow);
  for (let x = 71; x <= 79; x++) b.set(x, 32, Tile.WallWood);
  b.set(75, 32, Tile.DoorwayWood); // shop <-> milling floor
  // The milling floor.
  b.set(74, 30, Tile.Workbench); // the millstone's stand-in station
  b.set(71, 29, Tile.Crate).set(72, 29, Tile.Crate); // the grain sacks
  b.set(79, 29, Tile.Barrel);
  b.setDetail(76, 30, Detail.Straw).setDetail(72, 31, Detail.Straw);
  // The flour shop.
  b.set(72, 35, Tile.Counter).set(73, 35, Tile.Counter);
  b.set(78, 35, Tile.CrateGoods).set(79, 36, Tile.CrateGoods); // flour by the sack
  b.setDetail(74, 36, Detail.Doormat).setDetail(77, 34, Detail.Straw);
  b.set(69, 36, Tile.HangingSign); // "GARTON'S MILL — flour, meal, gossip."
  // The docks: the pier planks, the mooring barrels, the catch.
  for (let x = 81; x <= 86; x++) {
    b.set(x, 38, Tile.Bridge);
    b.set(x, 39, Tile.Bridge);
  }
  b.set(82, 37, Tile.LampPost);
  b.set(82, 41, Tile.Barrel);
  b.set(87, 40, Tile.FishingSpot);
  b.set(94, 29, Tile.FishingSpot);
  // The ferry shack (Peld's), down the shore path where the pond
  // narrows to the stream: his cot, his crates, his lamp lit late.
  b.fillRect(78, 48, 6, 5, Tile.WoodFloor);
  b.outlineRect(78, 48, 6, 5, Tile.WallWood);
  b.set(80, 48, Tile.DoorwayWood);
  b.set(78, 50, Tile.WallWoodWindow).set(83, 50, Tile.WallWoodWindow);
  b.set(82, 51, Tile.Bed);
  b.set(79, 51, Tile.Crate).set(79, 49, Tile.Barrel);
  b.set(84, 49, Tile.LampPost); // the ferry lamp
  b.set(84, 51, Tile.ToolRack); // nets and boathooks
  for (let y = 45; y <= 47; y++) b.set(80, y, Tile.Dirt); // the shore path
  b.set(89, 55, Tile.FishingSpot);
  // The willows lean where the water goes.
  b.set(88, 21, Tile.TreeWillow);
  b.set(97, 27, Tile.TreeWillow);
  b.set(99, 41, Tile.TreeWillow);
  b.set(95, 47, Tile.TreeWillow);
  b.set(85, 58, Tile.FibrePlant); // flax on the stream bank

  // ---------------------------------------------------------------
  // The East Road stub — signed, walked, and unfinished: the map
  // admitting there is more world than road. (Saltmere, someday.)
  // ---------------------------------------------------------------
  b.path({ x: 53, y: 61 }, { x: 111, y: 61 }, 2);
  for (let y = 60; y <= 61; y++) {
    const cx = 90 + Math.round(Math.sin(y * 0.18) * 2.5);
    for (let x = cx - 2; x <= cx + 2; x++) b.set(x, y, Tile.Bridge);
  }
  b.set(105, 58, Tile.HangingSign); // "EAST ROAD — the coast, eventually."
  b.set(66, 59, Tile.LampPost).set(84, 59, Tile.LampPost);

  // ---------------------------------------------------------------
  // The Waykeepers' Hall — the travelers' chapel FRONTS THE WEST
  // SPINE: a stone walk to double doors, a long nave of merged pews,
  // and the FACETED APSE at the far south end where the lectern
  // stands between two braziers. (Ansel's.)
  // ---------------------------------------------------------------
  b.fillRect(37, 56, 12, 17, Tile.StoneFloor);
  b.outlineRect(37, 56, 12, 17, Tile.WallStone);
  // The apse: two-step chamfers facet the south corners.
  b.set(37, 72, Tile.Grass).set(38, 72, Tile.Grass).set(37, 71, Tile.Grass);
  b.set(48, 72, Tile.Grass).set(47, 72, Tile.Grass).set(48, 71, Tile.Grass);
  b.set(38, 71, Tile.WallStoneDiagNE).set(37, 70, Tile.WallStoneDiagNE);
  b.set(47, 71, Tile.WallStoneDiagNW).set(48, 70, Tile.WallStoneDiagNW);
  b.set(42, 56, Tile.DoorwayStoneWide).set(43, 56, Tile.DoorwayStoneWide);
  b.set(39, 56, Tile.WallStoneWindow).set(46, 56, Tile.WallStoneWindow);
  b.set(37, 61, Tile.WallStoneWindow).set(37, 65, Tile.WallStoneWindow);
  b.set(48, 61, Tile.WallStoneWindow).set(48, 65, Tile.WallStoneWindow);
  // The apse end: lectern, braziers, the registry of who passed.
  b.set(42, 70, Tile.Lectern);
  b.set(39, 70, Tile.Brazier).set(46, 70, Tile.Brazier);
  b.setDetail(42, 69, Detail.Rug).setDetail(43, 69, Detail.Rug);
  b.set(38, 57, Tile.Bookshelf).set(47, 57, Tile.Cabinet);
  // Pews flank the aisle; adjacent benches merge into full rows.
  for (const y of [60, 63, 66]) {
    b.set(39, y, Tile.Bench).set(40, y, Tile.Bench);
    b.set(45, y, Tile.Bench).set(46, y, Tile.Bench);
  }
  b.setDetail(42, 57, Detail.Doormat).setDetail(43, 57, Detail.Doormat);
  // The chapel yard: the stone walk from the road, lamps and boxes.
  b.fillRect(42, 54, 2, 2, Tile.Path);
  b.set(40, 54, Tile.LampPost).set(45, 54, Tile.LampPost);
  b.set(39, 55, Tile.FlowerBox).set(46, 55, Tile.FlowerBox);
  b.set(35, 58, Tile.Bench);

  // ---------------------------------------------------------------
  // The Commons — the town's homes, spread around a real green with
  // gardens between them, every floor plan its own. Wear-paths run
  // where feet actually go.
  // ---------------------------------------------------------------
  // The farmhouse (Jorel & Tamsin's): faces the fields across the
  // road. Hearth hall west with the kitchen corner, the family's
  // bedroom east through its own door.
  b.fillRect(4, 56, 13, 10, Tile.WoodFloor);
  b.outlineRect(4, 56, 13, 10, Tile.WallWood);
  b.set(9, 56, Tile.DoorwayWood);
  b.set(7, 56, Tile.WallWoodWindow).set(13, 56, Tile.WallWoodWindow);
  b.set(4, 60, Tile.WallWoodWindow).set(16, 61, Tile.WallWoodWindow);
  b.set(8, 65, Tile.WallWoodWindow).set(13, 65, Tile.WallWoodWindow);
  for (let y = 57; y <= 64; y++) b.set(11, y, Tile.WallWood);
  b.set(11, 60, Tile.DoorwayWood);
  b.set(5, 57, Tile.Hearth);
  b.set(7, 60, Tile.Table).set(8, 60, Tile.Table); // the long farm table
  b.set(6, 60, Tile.Chair).set(9, 60, Tile.Chair);
  b.set(5, 62, Tile.Counter).set(5, 63, Tile.Counter).set(5, 64, Tile.Basin);
  b.setDetail(7, 61, Detail.Rug).setDetail(8, 61, Detail.Rug);
  b.setDetail(9, 57, Detail.Doormat);
  b.set(14, 58, Tile.Bed).set(14, 61, Tile.Bed);
  b.set(12, 57, Tile.Cabinet);
  b.setDetail(13, 60, Detail.RugRound);
  b.set(9, 54, Tile.Dirt).set(9, 55, Tile.Dirt); // the worn step to the road
  b.set(5, 66, Tile.Crate).set(6, 66, Tile.Crate); // the woodpile
  b.set(12, 66, Tile.Bench);
  // The coop, south of the woodpile; the hens go where they please.
  b.outlineRect(4, 68, 7, 6, Tile.Fence);
  b.fillRect(5, 69, 5, 4, Tile.Dirt);
  b.set(10, 70, Tile.Dirt); // the gate, east
  b.setDetail(6, 70, Detail.Straw).setDetail(8, 71, Detail.Straw);
  b.set(11, 70, Tile.Dirt).set(12, 70, Tile.Dirt);
  // Merra the grocer's: pantry stacks by the wall, table set for two,
  // her carrot plot out back. (She sells at the Round's stalls.)
  b.fillRect(20, 56, 9, 8, Tile.WoodFloor);
  b.outlineRect(20, 56, 9, 8, Tile.WallWood);
  b.set(24, 56, Tile.DoorwayWood);
  b.set(22, 56, Tile.WallWoodWindow).set(26, 56, Tile.WallWoodWindow);
  b.set(20, 59, Tile.WallWoodWindow).set(28, 59, Tile.WallWoodWindow);
  b.set(21, 57, Tile.CrateGoods).set(22, 57, Tile.CrateGoods);
  b.set(27, 57, Tile.Cabinet);
  b.set(23, 59, Tile.Table).set(24, 59, Tile.Chair);
  b.set(27, 61, Tile.Bed);
  b.setDetail(24, 57, Detail.Doormat).setDetail(24, 58, Detail.Rug);
  b.set(19, 58, Tile.Bench);
  b.set(24, 54, Tile.Dirt).set(24, 55, Tile.Dirt);
  b.fillRect(22, 65, 4, 2, Tile.Tilled);
  b.set(22, 65, Tile.CarrotMid).set(25, 66, Tile.CarrotRipe);
  // Cormund the banker's: the study window west — bookshelves and
  // the desk he thinks at — his bed across the room. Tidy front.
  b.fillRect(13, 69, 10, 8, Tile.WoodFloor);
  b.outlineRect(13, 69, 10, 8, Tile.WallWood);
  b.set(17, 69, Tile.DoorwayWood);
  b.set(15, 69, Tile.WallWoodWindow).set(20, 69, Tile.WallWoodWindow);
  b.set(13, 72, Tile.WallWoodWindow).set(22, 72, Tile.WallWoodWindow);
  b.set(14, 70, Tile.Bookshelf).set(15, 70, Tile.Bookshelf);
  b.set(14, 72, Tile.Table).set(15, 72, Tile.Chair); // the ledger desk
  b.set(20, 70, Tile.Bed);
  b.set(21, 73, Tile.Cabinet);
  b.setDetail(17, 70, Detail.Doormat).setDetail(17, 72, Detail.Rug);
  b.set(14, 68, Tile.FlowerBox).set(20, 68, Tile.FlowerBox);
  b.set(17, 67, Tile.Dirt).set(17, 68, Tile.Dirt);
  // Master Tilo's: shavings even at home — a half-finished chair in
  // the corner that has been half-finished for a year.
  b.fillRect(26, 67, 8, 8, Tile.WoodFloor);
  b.outlineRect(26, 67, 8, 8, Tile.WallWood);
  b.set(29, 67, Tile.DoorwayWood);
  b.set(31, 67, Tile.WallWoodWindow);
  b.set(26, 70, Tile.WallWoodWindow).set(33, 70, Tile.WallWoodWindow);
  b.set(27, 68, Tile.Bed);
  b.set(32, 68, Tile.Cabinet);
  b.set(29, 70, Tile.Table).set(30, 70, Tile.Chair);
  b.set(27, 71, Tile.Chair); // the half-finished one
  b.set(32, 73, Tile.Crate);
  b.setDetail(28, 70, Detail.Sawdust).setDetail(31, 72, Detail.Sawdust);
  b.setDetail(29, 68, Detail.Doormat);
  b.set(29, 65, Tile.Dirt).set(29, 66, Tile.Dirt);
  // Captain Aldis's: stone, spare, on the east road — the only home
  // in the diagonal budget, corners cut like her tower.
  b.fillRect(58, 63, 8, 7, Tile.StoneFloor);
  b.outlineRect(58, 63, 8, 7, Tile.WallStone);
  b.set(58, 69, Tile.WallStoneDiagNE).set(65, 69, Tile.WallStoneDiagNW);
  b.set(61, 63, Tile.DoorwayStone);
  b.set(63, 63, Tile.WallStoneWindow);
  b.set(58, 66, Tile.WallStoneWindow).set(65, 66, Tile.WallStoneWindow);
  b.set(59, 64, Tile.Bed);
  b.set(64, 64, Tile.WeaponRack);
  b.set(61, 66, Tile.Table).set(62, 66, Tile.Chair);
  b.set(64, 68, Tile.Cabinet);
  b.setDetail(61, 64, Detail.Doormat);
  b.set(61, 62, Tile.Dirt); // her step to the road
  // Goodwife Perl's: the cottage IN the orchard she keeps, berries
  // at the step and apples out every window.
  b.fillRect(78, 66, 8, 7, Tile.WoodFloor);
  b.outlineRect(78, 66, 8, 7, Tile.WallWood);
  b.set(78, 69, Tile.DoorwayWood);
  b.set(81, 66, Tile.WallWoodWindow);
  b.set(78, 67, Tile.WallWoodWindow).set(85, 69, Tile.WallWoodWindow);
  b.set(83, 67, Tile.Bed);
  b.set(84, 71, Tile.Cabinet);
  b.set(80, 70, Tile.Table).set(81, 70, Tile.Chair);
  b.setDetail(80, 68, Detail.RugRound).setDetail(79, 69, Detail.Doormat);
  b.set(76, 68, Tile.BerryBush).set(76, 70, Tile.BerryBush);
  b.set(77, 66, Tile.FlowerBox);
  b.set(76, 69, Tile.Dirt).set(77, 69, Tile.Dirt);
  // The green itself: garden plots in the gaps, the bench under the
  // oak, a lamp for coming home late.
  b.fillRect(17, 60, 3, 2, Tile.Tilled);
  b.set(17, 60, Tile.CarrotMid).set(19, 61, Tile.CarrotRipe);
  b.fillRect(31, 58, 3, 2, Tile.Tilled);
  b.set(31, 58, Tile.SunflowerMid).set(33, 59, Tile.SunflowerRipe);
  b.set(34, 63, Tile.TreeOak);
  b.set(33, 62, Tile.Bench);
  b.set(28, 65, Tile.LampPost);

  // ---------------------------------------------------------------
  // Furrowfield farm — the fields across the road from the
  // farmhouse, gate south so the family crosses to work.
  // ---------------------------------------------------------------
  b.outlineRect(3, 36, 19, 12, Tile.Fence);
  b.set(12, 47, Tile.Dirt); // the field gate, south to the road
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
  b.set(12, 48, Tile.Dirt).set(12, 49, Tile.Dirt).set(12, 50, Tile.Dirt);

  // ---------------------------------------------------------------
  // The pasture — the northeast grazing, trough by the west rail.
  // (Perl feuds with these cows. The cows are winning.)
  // ---------------------------------------------------------------
  b.outlineRect(73, 2, 25, 9, Tile.Fence);
  b.set(78, 10, Tile.Dirt); // the gate, south
  b.set(75, 4, Tile.Basin);
  b.setDetail(80, 5, Detail.Straw).setDetail(88, 7, Detail.Straw);
  b.setDetail(93, 4, Detail.Straw);

  // ---------------------------------------------------------------
  // The orchard — Perl's apple rows between the east road and the
  // stream, her cottage standing among them.
  // ---------------------------------------------------------------
  for (const y of [63, 66, 69, 72, 75]) {
    for (const x of [68, 72, 76, 80, 84]) {
      if (x >= 77 && x <= 86 && y >= 65 && y <= 73) continue; // her dooryard
      b.set(x, y, Tile.TreeOak);
    }
  }
  b.set(70, 64, Tile.BerryBush).set(66, 72, Tile.BerryBush);
  b.set(85, 75, Tile.BerryBush);

  // ---------------------------------------------------------------
  // The Fordgate — the warm way home — and the west spine's lamps.
  // ---------------------------------------------------------------
  b.set(2, 50, Tile.PillarStone).set(2, 54, Tile.PillarStone);
  b.set(4, 49, Tile.LampPost).set(4, 55, Tile.LampPost);
  b.set(6, 49, Tile.HangingSign); // "DAWNMEAD — the First Road."
  b.set(14, 49, Tile.LampPost).set(26, 49, Tile.LampPost);
  // The other spines' lamps: sparse, where corners turn dark.
  b.set(56, 13, Tile.LampPost).set(50, 26, Tile.LampPost);
  b.set(50, 58, Tile.LampPost).set(55, 64, Tile.LampPost);
  // The smiths' lunch oak, alone in the west meadow.
  b.set(29, 28, Tile.TreeOak);
  b.set(30, 29, Tile.Bench);

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
      if (Math.abs(y - 61) <= 4 && x > 100) continue; // East stub breathes
      if (x >= 2 && x <= 23 && y >= 35 && y <= 49) continue; // fields
      if (x >= 72 && x <= 98 && y >= 1 && y <= 11) continue; // pasture
      if (x >= 3 && x <= 36 && y >= 66) continue; // the Commons' south yards
      if (x >= 64 && x <= 92 && y >= 62) continue; // the orchard floor
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.3 : edge < 7 ? 0.1 : 0;
      if (density > 0 && fordRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // THE PEOPLE (Epic 6): fifteen lives on the town's own clock.
  // Placements are the POST each routine measures from — the smith's
  // anvil, the teller's counter, the lectern, the mid-field furrow.
  // ---------------------------------------------------------------
  b.actor('smith_bretta', 14.5, 14.5, -Math.PI / 2, 'amber_smith');
  b.actor('master_tilo', 35.5, 17.5, Math.PI, 'amber_artisan');
  b.actor('sage_elowen', 67.5, 17.5, 0, 'amber_sage');
  b.actor('banker_cormund', 40.5, 28.3, Math.PI / 2, 'amber_banker');
  b.actor('innkeep_dunna', 62.5, 51.2, Math.PI / 2, 'amber_innkeep');
  b.actor('miller_garton', 74.5, 30.8, -Math.PI / 2, 'amber_miller');
  b.actor('ferryman_peld', 83.5, 38.5, 0, 'amber_ferryman');
  b.actor('grocer_merra', 23.5, 58.5, Math.PI / 2, 'amber_grocer');
  b.actor('outfitter_hask', 63.2, 6.5, Math.PI, 'amber_outfitter');
  b.actor('captain_aldis', 47.5, 4.5, Math.PI, 'amber_captain');
  b.actor('farmer_jorel', 11.5, 41.5, Math.PI / 2, 'amber_farmer');
  b.actor('farmer_tamsin', 7.5, 70.5, 0, 'amber_farmwife');
  b.actor('keeper_ansel', 42.5, 69.5, Math.PI / 2, 'amber_keeper');
  b.actor('orchardist_perl', 74.5, 68.5, -Math.PI / 2, 'amber_orchardist');
  b.actor('courier_nib', 52.5, 44.5, 0, 'amber_courier');

  // The animals — the town's working livestock.
  // ---------------------------------------------------------------
  b.npcSpawn('cow', 85, 6.5, 2.5, 3);
  b.npcSpawn('chicken', 7, 70.5, 1.4, 3);

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
