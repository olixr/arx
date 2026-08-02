import { Detail, Tile, awningTile, bracketSignDetail, pennantDetail, trellisDetail } from '@arx/shared';
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
 * THE LIVING-TOWN LAW (the third polish pass): Amberford is the town
 * that TEACHES. A waker's first real skills are learned here, so the
 * town must hold every early loop on its own ground:
 *  - Two cookfires (the anglers' Catch Fire on the shore, the inn's
 *    coaching-yard fire) — the only Tile.Campfire stations for miles.
 *  - The Amber Delf: copper and tin in the northeast cutting, with
 *    one iron face as the told-you-so for level fifteen.
 *  - The Free Furrows: gated common tilled ground, anyone may plant.
 *  - The retting bank's flax, the pond's trout, the orchard, and the
 *    pasture's milk close the loop for every Maker's Art trainer in
 *    Craft Row.
 *  - STORY ON THE GROUND. The Toll War memorial, the Old Ford, and
 *    the waystones say who this town is without a single quest
 *    marker: every plaque earns its place in the founding story.
 *
 * THE WALL LAW (the garrison pass): the town is ringed by a single
 * garrison curtain (tiles 139-145) with three true gates on the
 * three road mouths and 45-degree corner cuts — see THE TOWN WALL
 * section for the full reasoning. Gates stand open; only a hand
 * shuts them; NPCs never open garrison gates (the fence-gate debt),
 * so no routine may ever DEPEND on crossing a gate line.
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
  b.path({ x: 52, y: 69 }, { x: 52, y: 77 }, 3); // ...and on to the South Gate (the Salt Road)
  b.fillRect(51, 78, 3, 2, Tile.Path); // the mouth meets the carved Salt Road
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
  // The well dressed as the town's oldest fact: the trough the herds
  // drink from on market days, the bucket barrel, and the notice
  // board where the town speaks to strangers first.
  b.set(53, 41, Tile.Basin); // the trough
  b.set(50, 39, Tile.Barrel); // the bucket barrel
  b.sign(55, 37, 'THE ROUND', ['market at midday', 'the well is sweet — help yourself'], Tile.Signpost);
  // Produce row: two stands shoulder to shoulder where the spine
  // country meets the dock lane — the market spilling up the road,
  // the way real markets do. (The traveling traders' pitch.)
  b.stamp(MARKET_STALL, 59, 28);
  b.stamp(MARKET_STALL, 63, 28);
  // The inn's terrace: tables on the grass apron facing the plaza.
  b.set(56, 46, Tile.Bench).set(57, 46, Tile.Table).set(58, 46, Tile.Bench);

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
  // The small-ledger box: the vault's loose coin, behind the one
  // authored lock in town (factions Phase 5 — the pick's payoff).
  b.set(35, 26, Tile.ChestWood);
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
  // The crown watches the books: the two sigils flank the ledger
  // wall — this bank keeps the realm's coin under the realm's cloth.
  b.setDetail(40, 24, Detail.BannerCrown).setDetail(43, 24, Detail.BannerMoon);
  b.set(39, 26, Tile.Table).set(39, 27, Tile.Chair);
  // The lobby: the two banking chests flank the charter aisle — a
  // fitted crimson velvet runner from the double doors to the teller
  // line (the one state carpet outside Silverfall; the charter came
  // from the Crown, and the floor says so). Benches for the queue.
  b.set(38, 32, Tile.BankChest).set(43, 32, Tile.BankChest);
  b.set(45, 33, Tile.Bench).set(46, 33, Tile.Bench);
  for (let y = 30; y <= 34; y++) {
    b.setDetail(40, y, Detail.CarpetRoyal).setDetail(41, y, Detail.CarpetRoyal);
  }
  // The forecourt: a stone step down, lamps, and a walk to the Round.
  b.fillRect(39, 36, 4, 2, Tile.StoneFloor);
  b.path({ x: 41, y: 38 }, { x: 46, y: 39 }, 2, Tile.StoneFloor);
  b.set(38, 36, Tile.LampPost).set(43, 36, Tile.LampPost);
  // The facade wears the charter: crown west of the doors, moon east
  // (the paired-seat order), the way the castle gate flies them.
  b.setDetail(39, 35, Detail.BannerCrown).setDetail(42, 35, Detail.BannerMoon);
  // Market-day pennants between the charter cloths — the bank fronts
  // the Round, and the Round is a fair (weld, the ford's gold).
  b.setDetail(37, 35, pennantDetail(3)).setDetail(44, 35, pennantDetail(3));
  b.sign(37, 36, 'BANK OF AMBERFORD', ['coin kept, word kept']);
  // The Toll War memorial — the reason there is a bank at all. A
  // pillar for the ones who held the ford against the Redmasks,
  // braziers the Waykeepers keep fed, and the plaque every newcomer
  // walks past twice a day. Ansel and Aldis both stand here at dusk.
  b.fillRect(33, 36, 3, 3, Tile.StoneFloor);
  b.set(34, 37, Tile.PillarStone);
  b.set(33, 38, Tile.Brazier).set(35, 38, Tile.Brazier);
  b.sign(34, 40, 'THE TOLL WAR', ['for those who held the ford', 'the road stays free'], Tile.Signpost);

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
  // The commission shop: counter facing the door, work on the walls,
  // and the ledger desk where Bretta prices what the road broke.
  for (let x = 20; x <= 22; x++) b.set(x, 13, Tile.Counter);
  b.set(24, 11, Tile.Cabinet).set(24, 13, Tile.WeaponRack);
  b.set(19, 11, Tile.WeaponRack); // finished blades wait by the door
  b.set(20, 16, Tile.Table).set(21, 16, Tile.Chair); // the commission ledger
  b.setDetail(22, 16, Detail.RugRound);
  b.set(24, 15, Tile.ToolRack);
  b.set(19, 18, Tile.Crate).set(24, 17, Tile.CrateGoods);
  b.setDetail(21, 11, Detail.Doormat);
  // A customer's runner from the door to the counter — the one soft
  // thing in the building, and it stays on the shop side of the wall
  // (no cloth lives where the sparks do).
  for (let x = 20; x <= 22; x++) b.setDetail(x, 12, Detail.Rug);
  // The forge yard: trampled dirt, the outdoor rack, the deliveries.
  b.fillRect(11, 21, 14, 4, Tile.Dirt);
  b.set(13, 22, Tile.WeaponRack);
  b.set(17, 22, Tile.Basin); // the slack trough
  b.set(22, 22, Tile.Crate).set(23, 23, Tile.Barrel);
  b.setDetail(15, 23, Detail.Pebbles).setDetail(20, 22, Detail.Pebbles);
  b.sign(23, 9, 'IRONHEWN', ['smithing, shoeing, sharpening']);
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
  // The shop floor. The east half is the SHOWROOM: the master's copy
  // of the Silverfall weave hung on the shop wall over a grand 3x2
  // display rug — the artisan sells cloth, so the shop wears its own
  // best work where every customer's eye lands first.
  for (let x = 35; x <= 38; x++) b.set(x, 13, Tile.Counter);
  b.set(33, 11, Tile.Bookshelf).set(34, 11, Tile.Cabinet); // the pattern books
  b.set(44, 11, Tile.Cabinet).set(45, 12, Tile.CrateGoods); // bolts and thread
  b.setDetail(41, 10, Detail.Tapestry).setDetail(42, 10, Detail.Tapestry);
  for (let x = 41; x <= 43; x++) {
    b.setDetail(x, 12, Detail.Rug).setDetail(x, 13, Detail.Rug);
  }
  b.setDetail(38, 11, Detail.Doormat).setDetail(39, 11, Detail.Doormat);
  // The work line — and the piece still ON the loom: a half-woven
  // tapestry hangs on the workshop wall above it, warp showing.
  b.set(34, 17, Tile.Loom);
  b.set(38, 17, Tile.CarvingBench);
  b.set(40, 17, Tile.Sawhorse); // the board station joins the work line
  b.set(42, 17, Tile.Workbench);
  b.set(45, 16, Tile.Crate).set(45, 18, Tile.Barrel);
  b.setDetail(34, 15, Detail.Tapestry).setDetail(35, 15, Detail.Tapestry);
  b.setDetail(36, 16, Detail.Sawdust).setDetail(41, 16, Detail.Sawdust);
  b.sign(36, 9, "TILO'S", ['cloth, carving, commissions']);
  b.set(38, 9, Tile.Dirt).set(39, 9, Tile.Dirt);
  // The tanning pad, downwind off the east gable — hides stretched
  // on the frame, lime in the barrel, straw where the drips land.
  b.fillRect(49, 12, 3, 3, Tile.Dirt);
  b.set(50, 13, Tile.TanningRack);
  b.set(49, 14, Tile.Barrel);
  b.set(51, 12, Tile.ToolRack); // the drying frame
  b.setDetail(50, 14, Detail.Straw);

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
  b.setDetail(48, 0, Detail.BannerCrown); // the watch serves the crown
  b.setDetail(47, 6, Detail.Doormat);
  // The gate furniture: lamps where the lamplight ENDS, the sign that
  // tells you the truth, a rack for the watch's spare steel.
  b.set(52, 4, Tile.LampPost).set(56, 4, Tile.LampPost);
  b.sign(56, 5, 'SILVERFALL', ['north, by the High Road', 'Go armed.'], Tile.Signpost);
  b.set(52, 6, Tile.WeaponRack);
  b.fillRect(53, 0, 3, 2, Tile.Path); // the mouth meets the carved High Road
  // The gate itself is real garrison work now — a three-tile arched
  // gatehouse set in the town wall (laid in THE TOWN WALL section
  // below), sprung from Aldis's tower to the curtain. The masonry
  // flanking the arch WEARS the realm's colors — true hung banners
  // on the garrison faces (crown west, moon east, the paired-seat
  // order), replacing the old freestanding poles: the wall itself
  // welcomes the High Road now, the way the Court Gate does.
  b.setDetail(52, 1, Detail.BannerCrown).setDetail(56, 1, Detail.BannerMoon);
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
  b.setDetail(59, 6, Detail.Doormat);
  // A proper trade-floor rug where the customers stand and haggle.
  b.setDetail(60, 5, Detail.Rug).setDetail(61, 5, Detail.Rug);
  b.setDetail(60, 6, Detail.Rug).setDetail(61, 6, Detail.Rug);
  // The storeroom.
  b.set(66, 3, Tile.Crate).set(67, 3, Tile.CrateGoods).set(68, 4, Tile.Crate);
  b.set(66, 10, Tile.Barrel).set(67, 10, Tile.Barrel);
  b.setDetail(67, 6, Detail.Straw);
  b.sign(57, 4, "HASK'S OUTFITTING", ['last chance before the road']);
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
  // The waiting rug in front of the counter — patients stand soft.
  b.setDetail(62, 17, Detail.Rug).setDetail(63, 17, Detail.Rug);
  b.setDetail(62, 18, Detail.Rug).setDetail(63, 18, Detail.Rug);
  // The alembic lab, then her room behind it.
  b.set(68, 16, Tile.Alembic);
  b.set(70, 17, Tile.Basin);
  b.set(70, 19, Tile.Bookshelf);
  b.setDetail(67, 18, Detail.Straw); // herbs drying on the floor
  b.set(70, 21, Tile.Bed);
  b.set(67, 23, Tile.Cabinet);
  // Her one comfort: a real bedside rug, woven whole.
  b.setDetail(68, 21, Detail.Rug).setDetail(69, 21, Detail.Rug);
  b.setDetail(68, 22, Detail.Rug).setDetail(69, 22, Detail.Rug);
  // The herb garden, fenced and worked in rows.
  b.outlineRect(74, 15, 9, 8, Tile.Fence);
  b.set(74, 19, Tile.FenceGate); // the garden gate, standing open
  for (let x = 76; x <= 81; x += 1) {
    b.set(x, 17, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 19, x % 2 === 0 ? Tile.Tilled : Tile.SagewortMid);
    b.set(x, 21, x % 2 === 0 ? Tile.MoonbellMid : Tile.Tilled);
  }
  b.set(75, 21, Tile.WildSagewort).set(81, 16, Tile.WildMoonbell);
  b.sign(60, 17, 'ELOWEN', ['remedies, salves, sense']);
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
  // The Rest greets the dock lane the way coaching inns do: the mug
  // on its bracket, and madder-striped canvas over the south windows.
  b.setDetail(68, 57, bracketSignDetail(0));
  b.set(66, 58, awningTile('market', 1)).set(71, 58, awningTile('market', 1));
  b.set(74, 46, Tile.WallWoodWindow).set(74, 53, Tile.WallWoodWindow);
  // The guest wing: a corridor wall and two rooms with real doors.
  for (let y = 45; y <= 51; y++) b.set(69, y, Tile.WallWood);
  b.set(69, 46, Tile.DoorwayWood).set(69, 50, Tile.DoorwayWood);
  for (let x = 70; x <= 73; x++) b.set(x, 48, Tile.WallWood);
  // Each room earns a whole 2x2 woven rug — a paying guest's floor
  // should be warmer than the corridor's boards.
  b.set(73, 45, Tile.Bed).set(70, 47, Tile.Cabinet);
  b.setDetail(71, 46, Detail.Rug).setDetail(72, 46, Detail.Rug);
  b.setDetail(71, 47, Detail.Rug).setDetail(72, 47, Detail.Rug);
  b.set(73, 51, Tile.Bed).set(70, 49, Tile.Cabinet);
  b.setDetail(71, 49, Detail.Rug).setDetail(72, 49, Detail.Rug);
  b.setDetail(71, 50, Detail.Rug).setDetail(72, 50, Detail.Rug);
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
  b.set(61, 56, Tile.Bed).set(62, 56, Tile.Bed).set(63, 56, Tile.Cabinet);
  // Dunna's nook keeps a real rug too — she sleeps by the barrels,
  // but she doesn't sleep on bare boards.
  b.setDetail(62, 54, Detail.Rug).setDetail(63, 54, Detail.Rug);
  b.setDetail(62, 55, Detail.Rug).setDetail(63, 55, Detail.Rug);
  // The hearth room: the everlasting fire, a grand 3x2 hall rug laid
  // from the doors toward the fire (the one-loom law weaves it into
  // a single medallion cloth), and the table clusters around it. The
  // Silverfall weave hangs over the tables — every coaching inn
  // hangs a picture of where the road goes, and this road goes THERE.
  b.set(61, 45, Tile.Hearth);
  b.set(63, 48, Tile.Table).set(62, 48, Tile.Chair).set(64, 48, Tile.Chair);
  b.set(66, 46, Tile.Table).set(66, 47, Tile.Chair);
  b.set(66, 50, Tile.Table).set(65, 50, Tile.Chair).set(67, 50, Tile.Chair);
  b.setDetail(65, 44, Detail.Tapestry).setDetail(66, 44, Detail.Tapestry);
  for (let x = 62; x <= 64; x++) {
    b.setDetail(x, 46, Detail.Rug).setDetail(x, 47, Detail.Rug);
  }
  b.setDetail(63, 45, Detail.Doormat).setDetail(64, 45, Detail.Doormat);
  // The inn yard: sign and lamp at the plaza door, the travelers'
  // bench on the lane side, the cellar deliveries along the gable.
  b.sign(61, 43, "THE WANDERER'S REST", ['beds, board, and the news']);
  b.set(66, 43, Tile.LampPost);
  b.set(70, 43, Tile.FlowerBox);
  b.set(63, 43, Tile.Dirt).set(64, 43, Tile.Dirt);
  b.set(59, 49, Tile.Bench);
  b.set(75, 54, Tile.Barrel).set(75, 55, Tile.Barrel).set(75, 56, Tile.Crate);
  // The coaching-yard fire on the lane side: where Dunna cooks the
  // midday stew, and where a traveler who can't pay for the board
  // is welcome to cook their own. The town's second cookfire.
  b.set(57, 53, Tile.Campfire);
  b.set(56, 52, Tile.Bench).set(58, 54, Tile.Bench);
  b.set(56, 54, Tile.Barrel);
  b.setDetail(58, 52, Detail.Straw);

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
  // One modest runner where the customers queue — flour-dusted by
  // noon every market day, and Garton wouldn't have it otherwise.
  b.setDetail(75, 34, Detail.Rug).setDetail(76, 34, Detail.Rug);
  b.sign(69, 36, "GARTON'S MILL", ['flour, meal, and gossip']);
  // The millrace: the pond let through a sluice to lap the mill's
  // east wall. The wheel itself is still on the mason's list, but
  // the water already stands where the wheel will hang.
  b.fillRect(81, 30, 3, 2, Tile.WaterShallow);
  b.set(81, 29, Tile.RailWood).set(82, 29, Tile.RailWood).set(83, 29, Tile.RailWood);
  b.set(81, 32, Tile.RailWood).set(82, 32, Tile.RailWood);
  // The docks: the pier planks, the mooring barrels, the catch — a
  // true jetty (Tile.Dock), suspended on piles, not a bridge.
  for (let x = 81; x <= 86; x++) {
    b.set(x, 38, Tile.Dock);
    b.set(x, 39, Tile.Dock);
  }
  b.set(82, 37, Tile.LampPost);
  b.set(82, 41, Tile.Barrel);
  b.set(87, 40, Tile.FishingSpot);
  b.set(94, 29, Tile.FishingSpot);
  // The jetty grows a finger south — mooring for the punt-to-be —
  // and the ANGLERS' FIRE burns on the shore beside it: benches, a
  // net rack, and coals hot enough to teach any waker what to do
  // with a fresh trout. The first cookfire on the First Road.
  b.fillRect(84, 40, 2, 3, Tile.Dock);
  b.set(85, 42, Tile.Barrel); // the mooring barrel
  b.set(82, 44, Tile.ToolRack); // nets and boathooks
  b.set(80, 42, Tile.Campfire);
  b.set(79, 41, Tile.Bench).set(81, 43, Tile.Bench);
  b.sign(78, 43, 'THE CATCH FIRE', ['fresh trout, hot coals', 'cook your own'], Tile.Signpost);
  // The ferry shack (Peld's), down the shore path where the pond
  // narrows to the stream: his cot, his crates, his lamp lit late.
  b.fillRect(78, 48, 6, 5, Tile.WoodFloor);
  b.outlineRect(78, 48, 6, 5, Tile.WallWood);
  b.set(80, 48, Tile.DoorwayWood);
  b.set(78, 50, Tile.WallWoodWindow).set(83, 50, Tile.WallWoodWindow);
  b.set(82, 51, Tile.Bed);
  b.set(79, 51, Tile.Crate).set(79, 49, Tile.Barrel);
  b.setDetail(81, 50, Detail.RugRound); // the one soft thing Peld owns
  b.set(84, 49, Tile.LampPost); // the ferry lamp
  b.set(84, 51, Tile.ToolRack); // nets and boathooks
  for (let y = 45; y <= 47; y++) b.set(80, y, Tile.Dirt); // the shore path
  b.set(89, 55, Tile.FishingSpot);
  // The punt's landing: two planks to the stream and the rail Peld
  // leans on while he decides the water isn't ready yet.
  b.set(87, 52, Tile.Dock).set(88, 52, Tile.Dock);
  b.set(86, 52, Tile.RailWood);
  b.sign(84, 47, 'THE CROSSING', ['ring for Peld', 'downriver — someday'], Tile.Signpost);
  // The retting bank: flax cut, soaked, and spun to twine on the
  // stream's slack side — a loom's whole supply line in thirty feet.
  b.set(86, 54, Tile.FibrePlant).set(85, 56, Tile.FibrePlant).set(86, 58, Tile.FibrePlant);
  b.sign(84, 55, 'THE RETTING BANK', ['flax for the loom', 'cut what you need'], Tile.Signpost);
  // Reed shallows where the pond eases east.
  b.fillEllipse(98, 31, 2, 1.5, Tile.Swamp);
  b.fillEllipse(96, 45, 2, 1.5, Tile.Swamp);
  b.set(99, 33, Tile.FibrePlant).set(97, 47, Tile.FibrePlant);
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
  b.sign(105, 58, 'THE EAST ROAD', ['the coast, eventually'], Tile.Signpost);
  b.set(66, 59, Tile.LampPost).set(84, 59, Tile.LampPost);
  // The Old Ford — the shallows the town is named for, kept beside
  // the bridge the way a family keeps the first tool it ever owned.
  for (const x of [87, 88, 89]) {
    b.set(x, 62, Tile.WaterShallow);
    b.set(x, 63, Tile.WaterShallow);
  }
  b.setDetail(86, 62, Detail.Pebbles).setDetail(90, 63, Detail.Pebbles);
  b.sign(92, 59, 'THE OLD FORD', ['here the amber water ran shallow,', 'and a town grew on the crossing'], Tile.Signpost);

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
  // The apse end: lectern, braziers, the registry of who passed —
  // and THE PILGRIMS' MILE: a single woven runner the whole length
  // of the nave, door to lectern (the one-loom law lays the 2x12
  // block as one cloth, a diamond chain pacing its spine). Every
  // traveler who ever rested here walked this same strip of wool.
  b.set(42, 70, Tile.Lectern);
  b.set(39, 70, Tile.Brazier).set(46, 70, Tile.Brazier);
  for (let y = 58; y <= 69; y++) {
    b.setDetail(42, y, Detail.Rug).setDetail(43, y, Detail.Rug);
  }
  b.set(38, 57, Tile.Bookshelf).set(47, 57, Tile.Cabinet);
  // Over the doors, facing the lectern down the nave: the weave of
  // the road's far end — the Waykeepers hang the destination itself.
  b.setDetail(40, 56, Detail.Tapestry).setDetail(41, 56, Detail.Tapestry);
  // East pews only — the west aisle became the PILGRIM ALCOVE: two
  // cots and a locker for road-worn travelers, because the
  // Waykeepers' faith has always been a roof first, sermon second.
  for (const y of [60, 63, 66]) {
    b.set(45, y, Tile.Bench).set(46, y, Tile.Bench);
  }
  b.set(38, 60, Tile.Bed).set(39, 60, Tile.Bed);
  b.set(38, 63, Tile.Bed).set(39, 63, Tile.Bed);
  b.set(38, 66, Tile.Cabinet);
  b.setDetail(39, 61, Detail.RugRound).setDetail(39, 64, Detail.RugRound);
  // The REGISTRY corner: the book of who passed, at a desk by the
  // door where any traveler can find a name — or leave one.
  b.set(46, 59, Tile.Table).set(46, 58, Tile.Chair);
  b.setDetail(45, 59, Detail.RugRound);
  b.set(40, 58, Tile.Brazier).set(45, 58, Tile.Brazier); // the lamp kept lit, flanking the aisle
  b.setDetail(42, 57, Detail.Doormat).setDetail(43, 57, Detail.Doormat);
  // The chapel yard: the stone walk from the road, lamps and boxes.
  b.fillRect(42, 54, 2, 2, Tile.Path);
  b.set(40, 54, Tile.LampPost).set(45, 54, Tile.LampPost);
  b.set(39, 55, Tile.FlowerBox).set(46, 55, Tile.FlowerBox);
  b.set(35, 58, Tile.Bench);
  b.sign(46, 54, "WAYKEEPERS' HALL", ['rest, register, remember']);

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
  // The good rug — a 4x2 laid whole between the hearth and the long
  // table, the one Tamsin's mother wove and the one thing in the
  // house nobody puts muddy boots on.
  for (let x = 6; x <= 9; x++) {
    b.setDetail(x, 58, Detail.Rug).setDetail(x, 59, Detail.Rug);
  }
  b.setDetail(9, 57, Detail.Doormat);
  b.set(14, 58, Tile.Bed).set(14, 61, Tile.Bed);
  b.set(12, 57, Tile.Cabinet);
  b.setDetail(12, 59, Detail.Rug).setDetail(13, 59, Detail.Rug);
  b.setDetail(12, 60, Detail.Rug).setDetail(13, 60, Detail.Rug);
  b.set(9, 54, Tile.Dirt).set(9, 55, Tile.Dirt); // the worn step to the road
  b.set(5, 66, Tile.Crate).set(6, 66, Tile.Crate); // the woodpile
  b.set(12, 66, Tile.Bench);
  // The coop, south of the woodpile; the hens go where they please.
  b.outlineRect(4, 68, 7, 6, Tile.Fence);
  b.fillRect(5, 69, 5, 4, Tile.Dirt);
  b.set(10, 70, Tile.FenceGate); // the gate, standing open
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
  b.set(27, 61, Tile.Bed).set(26, 61, Tile.Bed);
  b.setDetail(24, 57, Detail.Doormat);
  // The parlor square between the table and her bed.
  b.setDetail(25, 59, Detail.Rug).setDetail(26, 59, Detail.Rug);
  b.setDetail(25, 60, Detail.Rug).setDetail(26, 60, Detail.Rug);
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
  b.setDetail(17, 70, Detail.Doormat);
  // A banker's rug: bought, not inherited, and it shows — woven
  // whole, laid square between the desk and the bed.
  b.setDetail(17, 71, Detail.Rug).setDetail(18, 71, Detail.Rug);
  b.setDetail(17, 72, Detail.Rug).setDetail(18, 72, Detail.Rug);
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
  b.setDetail(28, 68, Detail.RugRound); // a maker's offcut by the bed
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
  // The captain's colors over her own steel, and one spare runner at
  // the table — she'd call anything more clutter.
  b.setDetail(64, 63, Detail.BannerCrown);
  b.setDetail(61, 65, Detail.Rug).setDetail(62, 65, Detail.Rug);
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
  // Perl's braided square — apple-cider colors, worn soft.
  b.setDetail(80, 68, Detail.Rug).setDetail(81, 68, Detail.Rug);
  b.setDetail(80, 69, Detail.Rug).setDetail(81, 69, Detail.Rug);
  b.setDetail(79, 69, Detail.Doormat);
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
  b.set(12, 47, Tile.FenceGate); // the field gate, standing open
  // The west rail came down when the wall went up: the field runs to
  // the rampart's foot now, headland against the masonry (the north
  // and south rails butt into the curtain and seal the pen).
  for (let y = 37; y <= 46; y++) b.set(3, y, Tile.Grass);
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
  // The Free Furrows — common ground between the road and the bank's
  // west meadow: fenced, gated, and open to any hand that wants to
  // learn the spade. The town plants the odd rows; the empty ones
  // wait for wakers. First farm a traveler is allowed to touch.
  // ---------------------------------------------------------------
  b.outlineRect(24, 44, 7, 6, Tile.Fence);
  b.set(27, 49, Tile.FenceGate); // the gate, south to the road
  for (const x of [25, 26, 27, 28, 29]) {
    b.set(x, 45, Tile.Tilled);
    b.set(x, 47, Tile.Tilled);
  }
  b.set(25, 45, Tile.CarrotMid).set(28, 45, Tile.WheatMid);
  b.set(27, 47, Tile.SunflowerMid);
  b.set(27, 50, Tile.Dirt); // the worn step to the road
  b.sign(23, 49, 'THE FREE FURROWS', ['common ground', 'plant what you will, waker'], Tile.Signpost);

  // ---------------------------------------------------------------
  // The pasture — the northeast grazing, trough by the west rail.
  // (Perl feuds with these cows. The cows are winning.)
  // ---------------------------------------------------------------
  // The pen leans on the town wall now — the north rail IS the
  // rampart (the wall the cows never asked for and got anyway); the
  // side rails run up and die against the masonry.
  b.fillRect(73, 2, 1, 9, Tile.Fence); // west rail, to the wall
  b.fillRect(97, 2, 1, 9, Tile.Fence); // east rail, to the wall
  b.fillRect(74, 10, 23, 1, Tile.Fence); // the south rail
  b.set(78, 10, Tile.FenceGate); // the gate, standing open
  b.set(75, 4, Tile.Basin);
  b.set(74, 3, Tile.Crate); // the milking corner
  b.setDetail(80, 5, Detail.Straw).setDetail(88, 7, Detail.Straw);
  b.setDetail(93, 4, Detail.Straw);
  b.sign(71, 7, 'HOLLOWAY PASTURE', ['fresh milk — mind the cows'], Tile.Signpost);

  // ---------------------------------------------------------------
  // The Amber Delf — the old cutting in the northeast birches where
  // the town's copper and tin come out of the ground: spoil heaps,
  // a work corner, a lamp for the early shift, and the one iron
  // face nobody's bronze pick has beaten yet. The first forge
  // lesson starts here, not at the anvil. Bretta walks up at dawn.
  // ---------------------------------------------------------------
  b.path({ x: 56, y: 13 }, { x: 101, y: 12 }, 1, Tile.Dirt); // the miners' trail
  b.fillEllipse(104, 8, 5.5, 4.5, Tile.Dirt);
  b.set(101, 5, Tile.RockCopper).set(106, 4, Tile.RockCopper);
  b.set(103, 11, Tile.RockTin).set(108, 7, Tile.RockTin);
  b.set(107, 10, Tile.RockIron); // the better-pick face
  b.set(100, 9, Tile.Rock).set(105, 12, Tile.Rock); // spoil
  b.set(100, 6, Tile.Crate).set(100, 7, Tile.Barrel); // the work corner
  b.set(99, 11, Tile.LampPost); // the early shift's lamp
  b.setDetail(103, 6, Detail.Pebbles).setDetail(105, 9, Detail.Pebbles);
  b.setDetail(102, 9, Detail.Pebbles).setDetail(106, 11, Detail.Pebbles);
  b.sign(57, 12, 'THE DELF', ['ore up the trail', 'mind your footing'], Tile.Signpost);
  b.sign(99, 9, 'THE AMBER DELF', ['copper and tin for the forge', 'the north face wants a better pick'], Tile.Signpost);

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
  // The old pillar-and-arch threshold gave way to the town wall's
  // west gate (laid in THE TOWN WALL section below); what remains
  // here is the welcome: lamps, the waystone, the watch's fires.
  // ---------------------------------------------------------------
  b.set(4, 49, Tile.LampPost).set(4, 55, Tile.LampPost);
  b.sign(6, 49, 'DAWNMEAD', ['west, by the First Road'], Tile.Signpost);
  b.set(14, 49, Tile.LampPost).set(26, 49, Tile.LampPost);
  b.sign(5, 55, 'AMBERFORD', ['the ford holds', 'the lamp stays lit'], Tile.Signpost);
  // The other spines' lamps: sparse, where corners turn dark.
  b.set(56, 16, Tile.LampPost).set(50, 26, Tile.LampPost);
  b.set(50, 58, Tile.LampPost).set(55, 64, Tile.LampPost);
  // The smiths' lunch oak, alone in the west meadow.
  b.set(29, 28, Tile.TreeOak);
  b.set(30, 29, Tile.Bench);

  // ---------------------------------------------------------------
  // THE TOWN WALL — the Toll War's long lesson, finally in stone.
  // A single garrison curtain rings the whole town (the frontier
  // grew bold; the town answered), with three gates standing open
  // where the three roads always ran, and every corner cut at 45 —
  // a wall raised by farmers follows its fields, not a straightedge.
  // Laws at work here:
  //  - SEPARATE MASONRY: the curtain dies honestly into Aldis's
  //    stone watch tower at the North Gate — two constructions, one
  //    defense; the pasture and Furrowfield lean their rails on it.
  //  - THE CORNER CUTS chain diagonally (DiagSE/SW/NW/NE with the
  //    solid triangle pointing INTO town); each hypotenuse meets the
  //    next corner-to-corner, so the seal is geometric, not luck.
  //  - Gates are authored OPEN (tile 144) and never auto-close
  //    untouched; a shut gate is the town under threat, and only a
  //    hand can make it so. The fen takes the stream under the wall
  //    at the reed neck — one soggy tile, the mason's compromise.
  // ---------------------------------------------------------------
  // The west curtain, Fordgate in the middle of it.
  b.fillRect(2, 4, 1, 47, Tile.WallGarrison); // y4-50
  b.set(2, 51, Tile.GateGarrison).set(2, 52, Tile.GateGarrison).set(2, 53, Tile.GateGarrison);
  b.fillRect(2, 54, 1, 22, Tile.WallGarrison); // y54-75
  // The north curtain, jointed to the watch tower, North Gate east
  // of it — the High Road passes under a true gatehouse arch.
  b.fillRect(5, 1, 40, 1, Tile.WallGarrison); // x5-44, dies into the tower
  b.set(52, 1, Tile.WallGarrison);
  b.set(53, 1, Tile.GateGarrison).set(54, 1, Tile.GateGarrison).set(55, 1, Tile.GateGarrison);
  b.fillRect(56, 1, 51, 1, Tile.WallGarrison); // x56-106, behind the pasture
  // The east curtain: the Delf tucked inside the corner cut, the
  // East Road let out through its own small gate.
  b.fillRect(110, 5, 1, 55, Tile.WallGarrison); // y5-59
  b.set(110, 60, Tile.GateGarrison).set(110, 61, Tile.GateGarrison);
  b.fillRect(110, 62, 1, 13, Tile.WallGarrison); // y62-74
  // The south curtain, wading the reed neck at x91 — with the South
  // Gate cut where the south lane always pointed: the Salt Road runs
  // from here to the water's end, and the wall admits it.
  b.fillRect(5, 78, 46, 1, Tile.WallGarrison); // x5-50
  b.set(51, 78, Tile.GateGarrison).set(52, 78, Tile.GateGarrison).set(53, 78, Tile.GateGarrison);
  b.fillRect(54, 78, 53, 1, Tile.WallGarrison); // x54-106
  // The four corner cuts — northwest, northeast, southeast, southwest.
  b.set(4, 2, Tile.WallGarrisonDiagSE).set(3, 3, Tile.WallGarrisonDiagSE);
  b.set(107, 2, Tile.WallGarrisonDiagSW).set(108, 3, Tile.WallGarrisonDiagSW);
  b.set(109, 4, Tile.WallGarrisonDiagSW);
  b.set(109, 75, Tile.WallGarrisonDiagNW).set(108, 76, Tile.WallGarrisonDiagNW);
  b.set(107, 77, Tile.WallGarrisonDiagNW);
  b.set(3, 76, Tile.WallGarrisonDiagNE).set(4, 77, Tile.WallGarrisonDiagNE);
  // The gates' furniture: watch fires at the Fordgate mouth, the
  // east gate's lamp so the unfinished road still gets a light, and
  // the South Gate's braziers with a plain word about the road they
  // open onto.
  b.set(3, 50, Tile.Brazier).set(3, 54, Tile.Brazier);
  b.set(108, 58, Tile.LampPost);
  b.set(49, 77, Tile.Brazier).set(55, 77, Tile.Brazier);
  b.sign(56, 75, 'THE SALT ROAD', ['to Saltmere and the mere country', 'a hard walk past the halfway lamp', 'go fed, go armed, go by day'], Tile.Signpost);

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
      if (Math.abs(x - 52) <= 4 && y > 70) continue; // South Gate breathes
      if (x >= 2 && x <= 23 && y >= 35 && y <= 49) continue; // fields
      if (x >= 72 && x <= 98 && y >= 1 && y <= 11) continue; // pasture
      if (x >= 97 && y <= 16) continue; // the Delf clearing
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
  // The town watch — two of Aldis's people on the wall's other
  // gates: one at the Fordgate mouth, one by the East Road gate.
  b.actor('amberford_watch', 4.5, 50.5, Math.PI, 'amber_watch');
  b.actor('amberford_watch', 108.5, 59.5, 0, 'amber_watch');
  // The traveling traders: stalls on the produce row by day, the
  // inn's guest wing by night — the market finally has voices.
  b.actor('round_trader', 60.0, 28.8, Math.PI / 2, 'amber_trader_a');
  b.actor('round_trader', 64.0, 28.8, Math.PI / 2, 'amber_trader_b');

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
