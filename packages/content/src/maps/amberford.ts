import {
  Detail,
  Tile,
  awningTile,
  bannerPoleTile,
  bracketSignDetail,
  pennantDetail,
  trellisDetail,
  wallBannerDetail,
} from '@arx/shared';
import { AMBERFORD_RECT } from '../geography.js';
import { MARKET_STALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Amberford — the crossroads market town, the second hearth of the
 * Dawnlands, rebuilt by THE FORD COMES HOME
 * (docs/amberford-remade-plan.md is the spec and the as-built record).
 *
 * The one-sentence fiction: the ford called the road, the road called
 * the Redmasks, the town answered with stone — and now the town has
 * walked back down to the water it was named for. The rect grew south
 * to the great river (seed 24601's real channel), so the Salt Road
 * bridge, the sandbar ford, the quay, the mill, the ferry, and the
 * tannery are authored town ground inside the zone's own lamplight.
 *
 * THE TOWN-PLAN LAW (unchanged in spirit, rebuilt in fact):
 *  - STREETS FIRST. North spine (High Road gate to the Round), west
 *    spine (Fordgate to the Round), the east street (Round to the
 *    East Gate), the south lane (east street to the water gate), and
 *    the craft lane. Every building fronts a street, the Round, or
 *    the Commons green; no two structures within three open tiles
 *    unless a road runs between them.
 *  - THE WALLED HEART. The garrison curtain rings ONLY the town
 *    (x16/x124, y8/y104) — the fields, the delf, the pasture, the
 *    orchard, and the whole river quarter live OUTSIDE it, which is
 *    what a market town is: a stone heart in open working country.
 *    Four true gates on the four roads plus the miners' postern;
 *    gates authored OPEN, only a hand shuts them, no routine may
 *    depend on crossing a gate line.
 *  - A DIAGONAL BUDGET. The watch tower's octagon, the chapel's
 *    faceted apse, the bank's plaza shoulders, Aldis's house.
 *  - ROOM INTENT. One job per room and the furniture to prove it.
 *  - THE MODERN KIT, spent at last: every shopfront wears an awning
 *    in its own dye with a bracket sign; the hedge family
 *    debuts on the chapel garden, the Commons green, and the herb
 *    garden; the town well is the world's first Tile.Well; the
 *    farming yard kit dresses everything that grows.
 *  - THE FORD DRESSED (the dressing pass): the town, trade, and
 *    commons shelves seated by hand — every placeholder upgraded to
 *    the prop it stood in for (Basin troughs -> WaterTrough, crate
 *    "sacks" -> GrainSacks, the barrel "mooring" -> MooringPost, the
 *    stamped fish cart -> a true FishmongerSlab market), every ADD
 *    earned by the fiction: the three books get slant desks, Peld's
 *    promised bell rings, the OLD HOUND pair guards the bridge,
 *    Tamsin's kitchen garden gets shears.
 *    Restraint is curation: NO TownFountain (the well is the heart),
 *    NO FounderStatue (nobody founded a crossing — a town grew on
 *    it), no potter's or chandler's kit (no such trade keeps shop
 *    here). Wall-shadow law honored: south/east/west aprons only.
 *
 * THE RIVER LAW: the Amber Water is authored to meet the worldgen
 * channel tile-for-tile at the hems (west entry rows local y114-128,
 * southeast exit x127-133 on the south hem, the tarn wrapping the NE
 * corner), so the edge-harmony law carries the water onward as the
 * real river outside. Upstream of the bridge the water is work;
 * downstream it is memory. The riverbed keeps a wadeable sandbar ford
 * beside the bridge — THE OLD FORD, kept the way a family keeps the
 * first tool it ever owned.
 *
 * The zone stamps into AMBERFORD_RECT exactly (geography.test pins
 * it) and the gates meet the carved roads tile-exact: First Road at
 * world (448,8) = local (0,64) — no, see below: the Fordgate rows are
 * local y50-52 = world y(-6..-4), First Road head (448,-4); High Road
 * head (518,-56) = local (70,0); Timber Road head (592,16) = local
 * gate rows y70-72; Salt Road head (536,88) = the far-bank mouth at
 * local (88,143).
 *
 * Anchors that must NOT move once routines re-land (offsets hang off
 * them): every actor placement at the bottom of this file, the well,
 * the bank counter, the bridge, both gates of every road, and the
 * Ford Door at world (578,70) — lowhall.ts DOOR_UP points at it.
 */
export function buildAmberford(): ZoneDef {
  const R = AMBERFORD_RECT;
  const b = new ZoneBuilder('amberford', 'Amberford', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE AMBER WATER — laid first, because the town answers the river,
  // never the other way round. Main channel west hem to the bridge
  // country, then the southeast turn out the south hem. Widths taper
  // from the broad west mouth (15 rows, matching the seed's hem
  // crossing y114-128) to a stately 8-9 at the bridge.
  // ---------------------------------------------------------------
  const bankN = (x: number) => 114 + Math.round(x * 0.115 + Math.sin(x * 0.21) * 1.5);
  const chanW = (x: number) => 15 - Math.round(x * 0.075);
  for (let x = 0; x <= 118; x++) {
    const yn = x === 0 ? 114 : bankN(x);
    const w = x === 0 ? 15 : chanW(x);
    for (let dy = 0; dy < w; dy++) {
      const y = yn + dy;
      let t = Tile.WaterShallow;
      if (dy >= 2 && dy < w - 2) t = Tile.Water;
      if (w >= 10 && dy >= 4 && dy < w - 4) t = Tile.WaterDeep;
      b.set(x, y, t);
    }
    // Soft fringes: reed-swamp flecks on both banks.
    if (fordRng(x, yn) < 0.3) b.set(x, yn - 1, Tile.Swamp);
    if (fordRng(x, yn + w) < 0.3) b.set(x, yn + w, Tile.Swamp);
  }
  // The southeast turn: past the ferry reach the channel swings off
  // the east miles and runs out the south hem at x127-133 (the
  // seed's exit arm), leaving the tannery bank dry above it.
  for (let x = 114; x <= 136; x++) {
    const yc = 129 + Math.round((x - 114) * 0.85 + Math.sin(x * 0.3) * 0.8);
    for (let dy = -4; dy <= 4; dy++) {
      const y = yc + dy;
      if (y > 143) continue;
      const a = Math.abs(dy);
      b.set(x, y, a <= 3 ? Tile.Water : Tile.WaterShallow);
    }
    if (fordRng(x, yc - 5) < 0.25) b.set(x, yc - 5, Tile.Swamp);
    if (fordRng(x, yc + 5) < 0.25 && yc + 5 <= 143) b.set(x, yc + 5, Tile.Swamp);
  }
  // THE NORTHEAST TARN — the still water on the town's cold corner,
  // wrapping the hem exactly where the seed's tarn stands outside
  // (north hem x135-143, east hem y0-8). Caravan beasts drink here.
  b.fillEllipse(142, 3, 8, 6.5, Tile.WaterShallow);
  b.fillEllipse(142, 3, 5.5, 4, Tile.Water);
  b.set(133, 6, Tile.Swamp).set(136, 9, Tile.Swamp).set(139, 10, Tile.Swamp);
  b.set(134, 2, Tile.FibrePlant).set(137, 8, Tile.FibrePlant);

  // ---------------------------------------------------------------
  // THE STREETS — a legible skeleton laid before a single wall, so
  // every building shoulders up to a real address.
  // ---------------------------------------------------------------
  b.path({ x: 0, y: 51 }, { x: 59, y: 51 }, 3); // the west spine: Fordgate -> the Round
  b.path({ x: 69, y: 0 }, { x: 69, y: 45 }, 3); // the north spine: North Gate -> the Round
  b.path({ x: 76, y: 61 }, { x: 87, y: 70 }, 3); // the east street leaves the Round south-about...
  b.fillRect(87, 70, 37, 3, Tile.Path); // ...and runs straight for the East Gate
  b.fillRect(125, 70, 19, 3, Tile.Path); // ...and out to the hem, where the Timber Road takes it
  b.path({ x: 87, y: 72 }, { x: 87, y: 104 }, 3); // the south lane: east street -> the water gate
  b.path({ x: 20, y: 27 }, { x: 116, y: 27 }, 2); // the craft lane
  b.path({ x: 87, y: 105 }, { x: 87, y: 124 }, 3); // the quay lane: water gate -> the bridge

  // ---------------------------------------------------------------
  // THE MARKET ROUND — the stone heart, half again wider than it ever
  // was: the town well at the center (the first Tile.Well in the
  // world — the market town earns it), stalls in facing rows, the
  // market oak, dyed banner poles, and the notice board that speaks
  // to strangers first. The respawn hearth stands beside the well.
  // ---------------------------------------------------------------
  b.fillEllipse(72, 53, 13, 9, Tile.StoneFloor);
  b.set(71, 52, Tile.Well);
  b.set(73, 52, Tile.WaterTrough); // the trough the herds drink from
  b.set(70, 51, Tile.Barrel); // the bucket barrel
  b.stamp(MARKET_STALL, 62, 46);
  b.stamp(MARKET_STALL, 66, 46); // the produce row: two stalls shoulder to shoulder
  b.stamp(MARKET_STALL, 78, 46);
  b.stamp(MARKET_STALL, 62, 57);
  b.stamp(MARKET_STALL, 78, 57); // Merra's morning pitch
  b.set(61, 45, bannerPoleTile(3)).set(83, 45, bannerPoleTile(5));
  b.set(61, 60, bannerPoleTile(1)).set(83, 60, bannerPoleTile(8));
  b.set(65, 53, Tile.StoneBench).set(79, 53, Tile.StoneBench); // the well ring sits on stone — masons' work, like the Round itself
  b.set(63, 61, Tile.TreeOak); // the market oak, shade for the southwest corner
  b.set(65, 62, Tile.Bench);
  b.set(66, 44, Tile.NoticeBoard); // the board that speaks to strangers first — beside the North Gate mouth, where every arrival reads it
  b.sign(75, 49, 'THE ROUND', ['market at midday', 'the well is sweet — help yourself'], Tile.Signpost);
  b.set(60, 49, Tile.LampPost).set(84, 49, Tile.LampPost);
  b.set(74, 62, Tile.LampPost);

  // ---------------------------------------------------------------
  // The Bank of Amberford — the Toll War's answer in stone, fronting
  // the west spine with its two plaza shoulders faceted. Lobby,
  // teller line, ledger wall, manager's office, and the windowless
  // vault room (locks.ts arms the inner door; coin sleeps in the
  // dark). Cormund's post.
  // ---------------------------------------------------------------
  b.fillRect(24, 32, 21, 15, Tile.StoneFloor);
  b.outlineRect(24, 32, 21, 15, Tile.WallStone);
  b.set(24, 46, Tile.WallStoneDiagNE); // the shoulders round to the forecourt
  b.set(44, 46, Tile.WallStoneDiagNW);
  b.set(33, 46, Tile.DoorwayStoneWide).set(34, 46, Tile.DoorwayStoneWide);
  b.set(28, 46, Tile.WallStoneWindow).set(40, 46, Tile.WallStoneWindow);
  b.set(28, 32, Tile.WallStoneWindow).set(37, 32, Tile.WallStoneWindow).set(42, 32, Tile.WallStoneWindow);
  b.set(44, 36, Tile.WallStoneWindow).set(44, 42, Tile.WallStoneWindow);
  // The vault room: an inner wall, no windows, the one authored lock.
  for (let y = 33; y <= 45; y++) b.set(29, y, Tile.WallStone);
  b.set(29, 39, Tile.DoorwayStone); // world (477,-17) — locks.ts re-points here
  b.set(25, 34, Tile.Vault).set(25, 38, Tile.Vault).set(25, 42, Tile.Vault);
  b.set(27, 33, Tile.Cabinet);
  b.set(26, 45, Tile.CrateGoods);
  b.set(27, 44, Tile.ChestWood); // the small-ledger box behind the lock
  // The manager's office, walled into the northeast light.
  for (let y = 33; y <= 35; y++) b.set(38, y, Tile.WallStone);
  b.set(38, 34, Tile.DoorwayStone);
  for (let x = 39; x <= 43; x++) b.set(x, 36, Tile.WallStone);
  b.set(41, 36, Tile.DoorwayStone);
  b.set(43, 33, Tile.Bookshelf);
  b.set(40, 34, Tile.ScribesDesk).set(41, 34, Tile.Chair); // Cormund's slant desk — the second of the town's three books
  b.setDetail(40, 35, Detail.RugRound);
  // The teller line and the staff floor behind it.
  for (let x = 32; x <= 37; x++) b.set(x, 40, Tile.Counter);
  b.set(33, 37, Tile.Bookshelf).set(34, 37, Tile.Bookshelf); // the ledger wall
  b.setDetail(33, 32, Detail.BannerCrown).setDetail(36, 32, Detail.BannerMoon);
  b.set(31, 37, Tile.Table).set(31, 38, Tile.Chair);
  // The lobby: banking chests flank the charter aisle — the fitted
  // crimson runner from the double doors to the teller line, benches
  // for the queue.
  b.set(31, 44, Tile.BankChest).set(38, 44, Tile.BankChest);
  b.set(41, 44, Tile.Bench).set(42, 44, Tile.Bench);
  for (let y = 41; y <= 45; y++) {
    b.setDetail(33, y, Detail.CarpetRoyal).setDetail(34, y, Detail.CarpetRoyal);
  }
  b.setDetail(33, 45, Detail.Doormat).setDetail(34, 45, Detail.Doormat);
  // The facade wears the charter — crown west of the doors, moon
  // east, the paired-seat order — with market-day pennants beyond.
  b.setDetail(31, 46, Detail.BannerCrown).setDetail(36, 46, Detail.BannerMoon);
  b.setDetail(26, 46, pennantDetail(3)).setDetail(42, 46, pennantDetail(3));
  b.sign(37, 47, 'BANK OF AMBERFORD', ['coin kept, word kept']);
  // The forecourt: a stone walk down to the west spine.
  b.fillRect(32, 47, 4, 3, Tile.StoneFloor);
  b.set(37, 48, Tile.LampPost);
  // THE TOLL WAR MEMORIAL — the reason there is a bank at all: the
  // pillar for the ones who held the ford, braziers the Waykeepers
  // keep fed, and a low hedge run — the town gardens its grief.
  // Ansel and Aldis both stand here at dusk; Rowan reads the names,
  // and the stone bench is for whoever needs to sit with them.
  b.fillRect(25, 47, 6, 3, Tile.StoneFloor);
  b.set(27, 48, Tile.PillarStone);
  b.set(25, 48, Tile.Brazier).set(29, 48, Tile.Brazier);
  b.set(26, 47, Tile.StoneBench);
  b.set(23, 47, Tile.Hedge).set(23, 48, Tile.Hedge).set(23, 49, Tile.Hedge); // the town gardens its grief
  b.setDetail(24, 50, Detail.Flowers).setDetail(30, 50, Detail.Flowers);
  b.sign(31, 49, 'THE TOLL WAR', ['for those who held the ford', 'the road stays free'], Tile.Signpost);

  // ---------------------------------------------------------------
  // CRAFT ROW — the working north of town, along the craft lane.
  // The smithy (Master Bretta Ironhewn): forge hall west, commission
  // shop east, the working yard between building and lane.
  // ---------------------------------------------------------------
  b.fillRect(20, 11, 19, 13, Tile.StoneFloor);
  b.outlineRect(20, 11, 19, 13, Tile.WallStone);
  b.set(25, 23, Tile.DoorwayStoneWide).set(26, 23, Tile.DoorwayStoneWide); // forge door on the yard
  b.set(34, 23, Tile.DoorwayStone); // shop door
  b.set(22, 11, Tile.WallStoneWindow).set(31, 11, Tile.WallStoneWindow).set(36, 11, Tile.WallStoneWindow);
  b.set(20, 15, Tile.WallStoneWindow).set(20, 20, Tile.WallStoneWindow);
  b.set(38, 15, Tile.WallStoneWindow).set(38, 20, Tile.WallStoneWindow);
  b.set(30, 23, Tile.WallStoneWindow);
  for (let y = 12; y <= 22; y++) b.set(31, y, Tile.WallStone);
  b.set(31, 17, Tile.DoorwayStone); // hall <-> shop
  // The forge hall: furnaces on the wall, the bellows at the fires'
  // shoulder, paired anvils, the ingot rack fed by the Delf, and the
  // quench where every blade ends its argument.
  b.set(21, 13, Tile.Furnace).set(21, 17, Tile.Furnace);
  b.set(21, 15, Tile.SmithBellows); // one set of lungs between two fires
  b.set(25, 14, Tile.Anvil).set(25, 18, Tile.Anvil);
  b.set(28, 12, Tile.ToolRack);
  b.set(29, 13, Tile.IngotRack); // copper, tin, and the iron the Delf owes
  b.set(29, 21, Tile.QuenchTrough); // the quench
  b.set(21, 21, Tile.Crate).set(22, 21, Tile.Barrel); // the coal store
  b.setDetail(23, 15, Detail.Pebbles).setDetail(27, 19, Detail.Pebbles);
  b.setDetail(25, 22, Detail.Doormat).setDetail(26, 22, Detail.Doormat);
  // The commission shop: counter facing its own door, work on the
  // walls, the ledger desk where Bretta prices what the road broke.
  for (let x = 33; x <= 35; x++) b.set(x, 15, Tile.Counter);
  b.set(37, 12, Tile.Cabinet).set(37, 14, Tile.WeaponRack);
  b.set(32, 12, Tile.WeaponRack); // finished blades wait by the door
  b.set(33, 19, Tile.Table).set(34, 19, Tile.Chair); // the commission ledger
  b.set(37, 18, Tile.ToolRack);
  b.set(32, 21, Tile.Crate).set(37, 21, Tile.CrateGoods);
  for (let x = 33; x <= 35; x++) b.setDetail(x, 16, Detail.Rug);
  b.setDetail(34, 22, Detail.Doormat);
  b.setDetail(35, 23, wallBannerDetail(2));
  // The forge yard: trampled dirt between the doors and the lane —
  // the grindstone where the road's edges come back, the slack
  // trough, and the delivery crates the caravans drop.
  b.fillRect(21, 24, 17, 2, Tile.Dirt);
  b.set(22, 24, Tile.WeaponRack);
  b.set(26, 24, Tile.Grindstone); // shoeing, sharpening — the sign keeps its word
  b.set(29, 25, Tile.WaterTrough); // the slack trough
  b.set(36, 24, Tile.CrateStack).set(37, 25, Tile.Barrel); // the delivery drop
  b.setDetail(25, 25, Detail.Pebbles).setDetail(32, 24, Detail.Pebbles);
  b.set(34, 24, awningTile('shed', 2)); // shade over the shop step
  b.sign(36, 10, 'IRONHEWN', ['smithing, shoeing, sharpening']);
  b.setDetail(33, 10, Detail.Sawdust);

  // Hask's Outfitting — the gate's west post, the last shop before
  // the High Road: pack wall, bow rack, counter facing the door, the
  // storeroom walled east, and a real porch on the lane so the road
  // crowd can try boots sitting down.
  b.fillRect(42, 11, 15, 11, Tile.WoodFloor);
  b.outlineRect(42, 11, 15, 11, Tile.WallWood);
  b.set(49, 21, Tile.DoorwayWood); // door south toward the craft lane
  b.set(44, 11, Tile.WallWoodWindow).set(51, 11, Tile.WallWoodWindow);
  b.set(42, 15, Tile.WallWoodWindow).set(42, 19, Tile.WallWoodWindow);
  b.set(56, 14, Tile.WallWoodWindow).set(45, 21, Tile.WallWoodWindow).set(54, 21, Tile.WallWoodWindow);
  for (let y = 12; y <= 20; y++) b.set(52, y, Tile.WallWood);
  b.set(52, 16, Tile.DoorwayWood); // shop <-> store
  for (let y = 14; y <= 16; y++) b.set(47, y, Tile.Counter);
  b.set(43, 12, Tile.CrateGoods).set(44, 12, Tile.ShopShelf); // the pack wall — open bays, every good its own silhouette
  b.set(48, 12, Tile.WeaponRack); // bows and arrows
  b.set(50, 12, Tile.FletchersBench); // shafts fletched between caravans — an outfitter sells nothing he can't mend
  b.set(43, 20, Tile.ToolRack); // torches, rope, spades
  b.set(46, 20, Tile.Barrel); // pitch for the torches
  b.setDetail(45, 15, Detail.Rug).setDetail(45, 16, Detail.Rug);
  b.setDetail(46, 15, Detail.Rug).setDetail(46, 16, Detail.Rug);
  b.setDetail(49, 20, Detail.Doormat);
  b.set(53, 12, Tile.Crate).set(54, 12, Tile.CrateStack).set(54, 14, Tile.Crate);
  b.set(53, 20, Tile.Barrel).set(55, 20, Tile.Barrel);
  b.setDetail(54, 16, Detail.Straw);
  // The porch: deck boards under the south eave, a bench, the awning,
  // and the day's stock carried out where the road crowd can handle it.
  b.fillRect(46, 22, 8, 2, Tile.PorchDeck);
  b.set(47, 22, Tile.TimberPost).set(53, 22, Tile.TimberPost);
  b.set(51, 22, Tile.DisplayTable); // rope, tin cups, whetstones — the last-chance table, clear of the door
  b.set(51, 23, Tile.Bench);
  b.set(46, 22, awningTile('board', 1));
  b.setDetail(53, 21, bracketSignDetail(4));
  b.sign(43, 10, "HASK'S OUTFITTING", ['last chance before the road']);

  // ---------------------------------------------------------------
  // THE NORTH GATE — where the High Road starts: Aldis's octagon
  // watch tower west of the arch, and ROWAN'S REGISTRY east of it —
  // the gate book, the letter rack, and the bench where every new
  // name gets a minute to sit down. (Wren's old friend keeps the
  // book; her wakers walk in already known.)
  // ---------------------------------------------------------------
  // The tower: a true octagon standing IN the wall line — its own
  // masonry seals the curtain's course (the separate-masonry law:
  // the garrison work dies honestly into Aldis's stone).
  b.fillRect(61, 8, 7, 8, Tile.StoneFloor);
  for (let x = 61; x <= 67; x++) b.set(x, 8, Tile.WallStone); // the north face holds the wall line
  for (let x = 62; x <= 66; x++) b.set(x, 15, Tile.WallStone);
  for (let y = 10; y <= 13; y++) b.set(61, y, Tile.WallStone);
  for (let y = 10; y <= 13; y++) b.set(67, y, Tile.WallStone);
  b.set(61, 9, Tile.WallStoneDiagSE).set(67, 9, Tile.WallStoneDiagSW);
  b.set(61, 14, Tile.WallStoneDiagNE).set(67, 14, Tile.WallStoneDiagNW);
  b.set(64, 15, Tile.DoorwayStone);
  b.set(64, 8, Tile.WallStoneWindow);
  b.set(61, 11, Tile.WallStoneWindow).set(67, 12, Tile.WallStoneWindow);
  b.set(63, 10, Tile.WeaponRack).set(66, 10, Tile.WeaponRack);
  b.set(62, 12, Tile.Bed).set(62, 13, Tile.Bed); // the gate pair's hot bunk, feet to the door
  b.set(65, 12, Tile.Table).set(66, 12, Tile.Chair); // the duty table
  b.set(62, 11, Tile.Brazier); // the watch fire
  b.setDetail(63, 8, Detail.BannerCrown);
  b.setDetail(64, 14, Detail.Doormat);
  // Rowan's registry: a snug stone gate-room east of the arch.
  b.fillRect(72, 9, 8, 7, Tile.StoneFloor);
  b.outlineRect(72, 9, 8, 7, Tile.WallStone);
  b.set(75, 15, Tile.DoorwayStone); // door south, off the spine
  b.set(74, 9, Tile.WallStoneWindow).set(77, 9, Tile.WallStoneWindow);
  b.set(72, 12, Tile.WallStoneWindow).set(79, 12, Tile.WallStoneWindow);
  b.set(74, 11, Tile.ScribesDesk).set(74, 12, Tile.Chair); // the gate book's desk — the first of the town's three books
  b.set(73, 10, Tile.Lectern); // the book itself, open to today
  b.set(73, 12, Tile.CandleStand); // he writes until the last name is in, whatever hour it arrives
  b.set(78, 10, Tile.Bookshelf); // forty years of filled registers
  b.set(78, 13, Tile.Cabinet); // the letter rack — Wren writes weekly
  b.set(76, 13, Tile.Bench); // where the newly arrived sit down
  b.set(77, 10, Tile.Bed).set(77, 11, Tile.Bed); // he sleeps beside the book he keeps
  b.setDetail(76, 11, Detail.RugRound);
  b.setDetail(75, 14, Detail.Doormat);
  b.setDetail(76, 9, Detail.BannerMoon);
  b.set(78, 17, Tile.WayfarersRest); // somebody's whole life leaned by the door while their name dries in the book
  b.sign(72, 16, 'THE GATE BOOK', ['every name that walks north', 'signed in, hoped home'], Tile.Signpost);
  // The gate furniture: lamps where the lamplight ends, the sign that
  // tells the truth, banners on the garrison faces.
  b.set(64, 4, Tile.LampPost).set(74, 4, Tile.LampPost);
  b.sign(74, 5, 'SILVERFALL', ['north, by the High Road', 'Go armed.'], Tile.Signpost);
  b.fillRect(68, 0, 3, 8, Tile.Path); // the mouth meets the carved High Road

  // ---------------------------------------------------------------
  // THE FORD STABLE (Bray) — the coaching yard the roads finally
  // paid for, inside the gate where every caravan beast arrives:
  // rail paddock with the three-stall pen, feed and hay, the tack
  // barn, and Bray's room at the barn's warm end.
  // ---------------------------------------------------------------
  b.outlineRect(84, 11, 17, 12, Tile.Fence);
  b.set(84, 17, Tile.FenceGate); // the paddock gate, standing open on the spine side
  b.set(88, 16, Tile.BeastPen);
  b.set(86, 12, Tile.FeedTrough).set(87, 12, Tile.FeedTrough);
  b.set(98, 12, Tile.HayBale).set(96, 13, Tile.HayBale);
  b.set(97, 21, Tile.WaterTrough); // the paddock trough
  b.setDetail(90, 14, Detail.Straw).setDetail(94, 18, Detail.Straw).setDetail(88, 20, Detail.Straw);
  // The tack barn, jointed to the paddock's east rail.
  b.fillRect(103, 11, 13, 9, Tile.WoodFloor);
  b.outlineRect(103, 11, 13, 9, Tile.WallWood);
  b.set(103, 15, Tile.DoorwayWood); // barn door faces the paddock
  b.set(106, 19, Tile.DoorwayWood); // and the yard door south
  b.set(105, 11, Tile.WallWoodWindow).set(112, 11, Tile.WallWoodWindow);
  b.set(115, 14, Tile.WallWoodWindow).set(110, 19, Tile.WallWoodWindow);
  for (let y = 12; y <= 18; y++) b.set(110, y, Tile.WallWood);
  b.set(110, 15, Tile.DoorwayWood); // tack room <-> Bray's room
  b.set(104, 12, Tile.ToolRack).set(107, 12, Tile.ToolRack); // saddles and leads
  b.set(104, 18, Tile.GrainSacks).set(108, 18, Tile.Barrel); // oats by the door, priced first
  b.set(105, 17, Tile.BroomAndPail); // the mucking half-done — Bray stopped mid-sweep to argue with a horse
  b.setDetail(106, 14, Detail.Straw);
  b.set(114, 12, Tile.Bed);
  b.set(111, 12, Tile.Cabinet);
  b.set(113, 17, Tile.Table).set(114, 17, Tile.Chair);
  b.setDetail(112, 15, Detail.RugRound); // the one soft thing in a barn
  b.set(82, 20, Tile.WaterTrough); // the arrival trough by the spine — beasts drink first
  b.set(80, 19, Tile.HitchingPost); // and stand tied while their riders argue terms
  b.sign(82, 23, 'THE FORD STABLE', ['stalls, feed, and the first saddle', 'beasts fed before riders'], Tile.Signpost);
  b.setDetail(105, 19, wallBannerDetail(6));

  // The miners' postern and the delf trail (the east wall's small
  // honest door — the wardroom's patrol notes it twice a night).
  b.path({ x: 125, y: 20 }, { x: 130, y: 18 }, 1, Tile.Dirt);

  // ---------------------------------------------------------------
  // Tilo's Hall (Master Artisan) — patterns and cloth up front, the
  // public work line across the back: loom, carving bench, workbench,
  // sawhorse in a row. The tanning pad is GONE — the hides went home
  // to Swale's tannery on the riverbank, and Tilo could not be
  // happier about the smell. His cutting garden grows the cotton the
  // loom is hungriest for.
  // ---------------------------------------------------------------
  b.fillRect(48, 32, 17, 13, Tile.WoodFloor);
  b.outlineRect(48, 32, 17, 13, Tile.WallWood);
  b.set(55, 44, Tile.DoorwayWoodWide).set(56, 44, Tile.DoorwayWoodWide); // door on the Round's apron
  b.set(50, 44, Tile.WallWoodWindow).set(61, 44, Tile.WallWoodWindow);
  b.set(48, 36, Tile.WallWoodWindow).set(48, 41, Tile.WallWoodWindow);
  b.set(64, 36, Tile.WallWoodWindow).set(64, 41, Tile.WallWoodWindow);
  b.set(52, 32, Tile.WallWoodWindow).set(60, 32, Tile.WallWoodWindow);
  for (let x = 49; x <= 63; x++) b.set(x, 38, Tile.WallWood);
  b.set(55, 38, Tile.DoorwayWood); // shop <-> the work line
  // The shop floor: counter facing the doors, the pattern books, the
  // showroom wall wearing the Silverfall weave over the display rug.
  for (let x = 53; x <= 57; x++) b.set(x, 41, Tile.Counter);
  b.set(49, 43, Tile.Bookshelf).set(50, 43, Tile.ShopShelf); // patterns and thread on open bays
  b.set(63, 43, Tile.Cabinet).set(63, 42, Tile.ClothBolts); // true bolts by the door, leaning like they own the place
  b.set(59, 39, Tile.TailorsDummy); // the commission in progress, pinned over the display rug
  b.setDetail(58, 44, Detail.Tapestry).setDetail(59, 44, Detail.Tapestry);
  for (let x = 59; x <= 61; x++) {
    b.setDetail(x, 40, Detail.Rug).setDetail(x, 41, Detail.Rug);
  }
  b.setDetail(55, 43, Detail.Doormat).setDetail(56, 43, Detail.Doormat);
  // The work line, north light on every station — loom to lumber,
  // the whole stump-to-showroom flow in one row.
  b.set(50, 34, Tile.Loom);
  b.set(53, 34, Tile.CarvingBench);
  b.set(56, 34, Tile.Workbench);
  b.set(59, 34, Tile.Sawhorse);
  b.set(62, 34, Tile.LumberRack); // seasoned stock, one plank pulled
  b.set(62, 33, Tile.Crate).set(63, 35, Tile.Barrel);
  b.setDetail(51, 33, Detail.Tapestry).setDetail(52, 33, Detail.Tapestry); // the half-woven piece, warp showing
  b.setDetail(52, 36, Detail.Sawdust).setDetail(58, 36, Detail.Sawdust);
  b.set(55, 45, awningTile('bowed', 4)).set(59, 45, awningTile('bowed', 4));
  b.set(58, 45, Tile.DisplayTable); // remnant ends and ribbon under the awning — the loss leaders
  b.setDetail(52, 44, bracketSignDetail(2));
  b.sign(51, 46, "TILO'S PATTERNS", ['cloth, carving, commissions'], Tile.Signpost);
  b.set(66, 34, Tile.DyeVats); // the dye pair on the spine side, where the color can't stain the stock
  // The cutting garden: open beds of cotton for the hungry loom.
  for (let x = 52; x <= 60; x++) {
    b.set(x, 29, x % 2 === 0 ? Tile.CottonMid : Tile.Tilled);
    b.set(x, 30, x % 2 === 0 ? Tile.Tilled : Tile.CottonRipe);
  }
  b.set(62, 29, Tile.GrowingFrame);

  // ---------------------------------------------------------------
  // Elowen's Dispensary — off the north spine with a worn step to
  // her door: the remedy shop up front, the alembic lab in the north
  // light, her small room behind it, and the herb garden ringed in a
  // clipped hedge with its own arch: herbalism, visibly practiced.
  // ---------------------------------------------------------------
  b.fillRect(72, 30, 15, 13, Tile.WoodFloor);
  b.outlineRect(72, 30, 15, 13, Tile.WallWood);
  b.set(72, 36, Tile.DoorwayWood); // door west, on the spine
  b.set(72, 33, Tile.WallWoodWindow).set(72, 39, Tile.WallWoodWindow);
  b.set(76, 30, Tile.WallWoodWindow).set(82, 30, Tile.WallWoodWindow);
  b.set(86, 33, Tile.WallWoodWindow).set(86, 39, Tile.WallWoodWindow);
  b.set(76, 42, Tile.WallWoodWindow).set(82, 42, Tile.WallWoodWindow);
  for (let y = 31; y <= 41; y++) b.set(80, y, Tile.WallWood);
  b.set(80, 36, Tile.DoorwayWood); // shop <-> the back rooms
  for (let x = 81; x <= 85; x++) b.set(x, 37, Tile.WallWood);
  b.set(83, 37, Tile.DoorwayWood); // lab <-> her room
  // The remedy shop: counter by the door, pharmacopoeia behind it,
  // the chair where she hears symptoms.
  for (let y = 34; y <= 36; y++) b.set(76, y, Tile.Counter);
  b.set(74, 31, Tile.GlazedJars); // the remedy shelf's overflow — corked, waxed, one mouth open
  b.set(78, 31, Tile.Bookshelf).set(79, 31, Tile.Cabinet);
  b.set(78, 40, Tile.Table).set(77, 40, Tile.Chair);
  b.setDetail(74, 34, Detail.Rug).setDetail(74, 35, Detail.Rug);
  b.setDetail(75, 40, Detail.RugRound);
  b.setDetail(73, 36, Detail.Doormat);
  // The lab, then her room behind it.
  b.set(82, 32, Tile.Alembic);
  b.set(85, 32, Tile.Basin);
  b.set(85, 35, Tile.Bookshelf);
  b.set(83, 34, Tile.HerbRack); // the harvest drying in bunches, not on the floor — she runs a tighter lab than that
  b.set(85, 39, Tile.Bed);
  b.set(81, 41, Tile.Cabinet);
  b.setDetail(83, 39, Detail.Rug).setDetail(84, 39, Detail.Rug);
  b.setDetail(83, 40, Detail.Rug).setDetail(84, 40, Detail.Rug);
  b.sign(74, 29, 'ELOWEN', ['remedies, salves, sense']);
  b.set(71, 36, Tile.Dirt); // her worn step off the spine
  // The herb garden: the hedge ring, the arch, the working rows.
  for (let x = 89; x <= 96; x++) b.set(x, 31, Tile.Hedge);
  for (let x = 89; x <= 96; x++) b.set(x, 40, Tile.Hedge);
  for (let y = 32; y <= 39; y++) b.set(89, y, Tile.Hedge);
  for (let y = 32; y <= 39; y++) b.set(96, y, Tile.Hedge);
  b.set(89, 36, Tile.HedgeGate); // the hedge arch, facing her gable
  for (const y of [33, 35, 37]) {
    for (let x = 91; x <= 94; x++) {
      b.set(x, y, (x + y) % 2 === 0 ? (y === 33 ? Tile.SagewortRipe : y === 35 ? Tile.MoonbellMid : Tile.SagewortMid) : Tile.Tilled);
    }
  }
  b.set(91, 38, Tile.GrowingFrame).set(94, 38, Tile.DryingRack);
  b.set(95, 32, Tile.WildSagewort).set(90, 38, Tile.WildMoonbell);
  b.setDetail(90, 32, Detail.Flowers).setDetail(95, 39, Detail.Flowers);

  // ---------------------------------------------------------------
  // The Wanderer's Rest (Dunna) — the coaching inn grown to its
  // work: hearth hall, the long bar with the cellar nook (Dunna's
  // cot in the corner — she sleeps where the barrels are), walled
  // kitchen, FOUR guest rooms and Nib's box room in the east wing,
  // and the coach yard with the yard fire any traveler may cook on.
  // ---------------------------------------------------------------
  b.fillRect(90, 42, 21, 19, Tile.WoodFloor);
  b.outlineRect(90, 42, 21, 19, Tile.WallWood);
  b.set(90, 50, Tile.DoorwayWoodWide).set(90, 51, Tile.DoorwayWoodWide); // double doors on the Round
  b.set(90, 45, Tile.WallWoodWindow).set(90, 56, Tile.WallWoodWindow);
  b.set(94, 42, Tile.WallWoodWindow).set(99, 42, Tile.WallWoodWindow).set(107, 42, Tile.WallWoodWindow);
  b.set(94, 60, Tile.WallWoodWindow).set(99, 60, Tile.WallWoodWindow);
  b.set(110, 46, Tile.WallWoodWindow).set(110, 54, Tile.WallWoodWindow);
  // The guest wing: corridor wall, four rooms plus the box room.
  for (let y = 43; y <= 59; y++) b.set(103, y, Tile.WallWood);
  b.set(103, 45, Tile.DoorwayWood).set(103, 49, Tile.DoorwayWood);
  b.set(103, 53, Tile.DoorwayWood).set(103, 57, Tile.DoorwayWood);
  for (let x = 104; x <= 109; x++) b.set(x, 47, Tile.WallWood);
  for (let x = 104; x <= 109; x++) b.set(x, 51, Tile.WallWood);
  for (let x = 104; x <= 109; x++) b.set(x, 55, Tile.WallWood);
  b.set(109, 44, Tile.Bed).set(104, 46, Tile.Cabinet);
  b.setDetail(106, 45, Detail.Rug).setDetail(107, 45, Detail.Rug);
  b.set(109, 48, Tile.Bed).set(104, 50, Tile.Cabinet);
  b.setDetail(106, 49, Detail.Rug).setDetail(107, 49, Detail.Rug);
  b.set(109, 52, Tile.Bed).set(104, 54, Tile.Cabinet);
  b.setDetail(106, 53, Detail.Rug).setDetail(107, 53, Detail.Rug);
  b.set(109, 56, Tile.Bed).set(104, 58, Tile.Cabinet);
  b.setDetail(106, 57, Detail.Rug).setDetail(107, 57, Detail.Rug);
  // The kitchen, walled off the hall's south side; its east wall
  // leaves the passage col x102 open so the last guest room's door
  // is reached from the hall, never through anyone's bedroom.
  for (let x = 91; x <= 97; x++) b.set(x, 55, Tile.WallWood);
  b.set(94, 55, Tile.DoorwayWood);
  for (let y = 56; y <= 59; y++) b.set(97, y, Tile.WallWood);
  b.set(96, 57, Tile.Hearth); // the cook fire
  b.set(91, 57, Tile.Basin);
  b.set(92, 58, Tile.BreadOven); // the loaves for the common table — warm when the coach comes in
  b.set(92, 59, Tile.Counter).set(93, 59, Tile.Counter);
  b.set(95, 59, Tile.CrateGoods).set(91, 59, Tile.Crate);
  // Nib's box room: the smallest door in town and the proudest.
  b.set(98, 56, Tile.WallWood).set(100, 56, Tile.WallWood);
  b.set(99, 56, Tile.DoorwayWood);
  for (let y = 56; y <= 59; y++) b.set(101, y, Tile.WallWood);
  b.set(98, 58, Tile.Bed).set(98, 59, Tile.Bed);
  b.set(100, 57, Tile.Cabinet);
  b.setDetail(99, 58, Detail.RugRound); // Tilo burnt her name inside the satchel; Merra wove this
  // The bar and Dunna's cellar nook: the stacked cellar behind the
  // counter, and the stools where the news gets traded at the rail.
  for (let y = 50; y <= 53; y++) b.set(97, y, Tile.Counter);
  b.set(96, 51, Tile.WoodStool).set(96, 53, Tile.WoodStool);
  b.set(98, 49, Tile.BarrelStack).set(99, 49, Tile.Barrel);
  b.set(101, 52, Tile.Bed).set(101, 50, Tile.Cabinet);
  b.setDetail(100, 51, Detail.Rug).setDetail(101, 51, Detail.Rug);
  // The hearth room: the everlasting fire, the hall rug laid from the
  // doors toward it, table clusters, and the Silverfall weave hung
  // where every road-worn eye lands — the picture of where the road
  // goes, because this road goes THERE.
  b.set(91, 43, Tile.Hearth);
  b.set(94, 43, Tile.SettleBench); // the high-backed seat by the fire — first come, longest stayed
  b.set(91, 48, Tile.CloakStand); // road cloaks drip here, one peg always empty
  b.set(93, 46, Tile.Table).set(92, 46, Tile.Chair).set(94, 46, Tile.Chair);
  b.set(96, 44, Tile.Table).set(96, 45, Tile.Chair);
  b.set(93, 52, Tile.Table).set(92, 52, Tile.Chair).set(93, 53, Tile.Chair);
  b.set(100, 45, Tile.Table).set(100, 46, Tile.Chair).set(101, 45, Tile.Chair);
  b.setDetail(96, 42, Detail.Tapestry).setDetail(97, 42, Detail.Tapestry);
  for (let y = 49; y <= 52; y++) {
    b.setDetail(92, y, Detail.Rug).setDetail(93, y, Detail.Rug).setDetail(94, y, Detail.Rug);
  }
  b.setDetail(91, 50, Detail.Doormat).setDetail(91, 51, Detail.Doormat);
  // The inn's face: mug on its bracket, lamp, flower boxes, awnings.
  b.setDetail(93, 60, bracketSignDetail(0));
  b.set(95, 61, awningTile('market', 1)).set(100, 61, awningTile('market', 1));
  b.sign(99, 41, "THE WANDERER'S REST", ['beds, board, and the news']);
  b.set(88, 47, Tile.LampPost);
  b.set(88, 49, Tile.HitchingPost); // tie up by the doors — Bray boards, Dunna pours
  b.set(89, 48, Tile.FlowerBox).set(89, 53, Tile.FlowerBox);
  // The coach yard, south of the inn on the lane to nowhere in a
  // hurry: the yard fire (a town cookfire — catch a trout, cook it
  // on Dunna's coals, no charge), the tap cask under the eave, the
  // game nobody has won since spring, benches, the trough, the cargo.
  b.fillRect(92, 62, 16, 7, Tile.Dirt);
  b.set(97, 62, Tile.TapCask); // the yard's own amber water, horn mugs waiting
  b.set(98, 65, Tile.Campfire);
  b.set(96, 64, Tile.Bench).set(100, 66, Tile.Bench);
  b.set(102, 64, Tile.GameTable); // mid-argument, a mug set down on the corner
  b.set(101, 64, Tile.WoodStool).set(103, 64, Tile.WoodStool);
  b.set(95, 67, Tile.Woodpile); // two fires to feed — hearth and yard — so the wood is the story here
  b.set(106, 63, Tile.WaterTrough); // the coach trough
  b.set(104, 67, Tile.Crate).set(105, 67, Tile.Barrel);
  b.setDetail(97, 63, Detail.Straw).setDetail(103, 65, Detail.Pebbles);
  b.sign(93, 63, 'THE YARD FIRE', ['the coals are free', 'cook your catch'], Tile.Signpost);

  // ---------------------------------------------------------------
  // Merra's Provisions — a true shopfront at last, on the walk
  // between the west spine and the Round: shop floor north, her snug
  // room behind the counter wall, the carrot plot out back.
  // ---------------------------------------------------------------
  b.fillRect(46, 58, 11, 9, Tile.WoodFloor);
  b.outlineRect(46, 58, 11, 9, Tile.WallWood);
  b.set(50, 58, Tile.DoorwayWood); // door north, path up to the spine
  b.set(48, 58, Tile.WallWoodWindow).set(54, 58, Tile.WallWoodWindow);
  b.set(46, 61, Tile.WallWoodWindow).set(56, 61, Tile.WallWoodWindow);
  b.set(52, 66, Tile.WallWoodWindow);
  for (let x = 47; x <= 55; x++) b.set(x, 62, Tile.WallWood);
  b.set(51, 62, Tile.DoorwayWood);
  for (let x = 48; x <= 52; x++) b.set(x, 60, Tile.Counter);
  b.set(47, 58, Tile.HangingScale); // weighed honest beside the pantry stacks — the aisle round the counter stays open
  b.set(47, 59, Tile.CrateGoods).set(54, 59, Tile.CrateGoods); // the pantry stacks
  b.set(55, 59, Tile.GlazedJars); // preserves — last mile's plums in this mile's jars
  b.set(55, 61, Tile.ShopShelf);
  b.setDetail(49, 59, Detail.Rug).setDetail(50, 59, Detail.Rug);
  b.setDetail(50, 58, Detail.Doormat);
  b.set(48, 64, Tile.Bed).set(47, 64, Tile.Bed);
  b.set(54, 65, Tile.Table).set(53, 65, Tile.Chair);
  b.set(55, 63, Tile.Cabinet); // Edwin's cape hangs here, clean
  b.setDetail(50, 64, Detail.Rug).setDetail(51, 64, Detail.Rug);
  b.setDetail(49, 58, wallBannerDetail(3));
  b.setDetail(53, 58, trellisDetail(1));
  b.set(45, 59, Tile.FlowerBox);
  b.sign(53, 57, "MERRA'S PROVISIONS", ['nothing here traveled more than a mile']);
  for (let y = 53; y <= 57; y++) b.set(50, y, Tile.Dirt); // her path to the spine
  b.set(48, 55, Tile.ProduceStand); // the overflow stand on her path — what didn't fit the Round pitch
  b.fillRect(48, 68, 4, 2, Tile.Tilled);
  b.set(48, 68, Tile.CarrotMid).set(51, 69, Tile.CarrotRipe);
  b.set(53, 69, Tile.CompostBin);

  // ---------------------------------------------------------------
  // The Waykeepers' Hall (Ansel) — fronting the west spine down a
  // stone walk: the long nave, the faceted apse, the Pilgrims' Mile
  // runner, the pilgrim alcove (roof first, sermon second), the
  // registry desk — and the memorial garden along the east wall,
  // clipped hedges, where the hall's quiet gets a green room.
  // ---------------------------------------------------------------
  b.fillRect(22, 58, 15, 23, Tile.StoneFloor);
  b.outlineRect(22, 58, 15, 23, Tile.WallStone);
  // The apse: two-step chamfers facet the south corners.
  b.set(22, 80, Tile.Grass).set(23, 80, Tile.Grass).set(22, 79, Tile.Grass);
  b.set(36, 80, Tile.Grass).set(35, 80, Tile.Grass).set(36, 79, Tile.Grass);
  b.set(23, 79, Tile.WallStoneDiagNE).set(22, 78, Tile.WallStoneDiagNE);
  b.set(35, 79, Tile.WallStoneDiagNW).set(36, 78, Tile.WallStoneDiagNW);
  b.set(28, 58, Tile.DoorwayStoneWide).set(29, 58, Tile.DoorwayStoneWide);
  b.set(25, 58, Tile.WallStoneWindow).set(33, 58, Tile.WallStoneWindow);
  b.set(22, 63, Tile.WallStoneWindow).set(22, 70, Tile.WallStoneWindow);
  b.set(36, 63, Tile.WallStoneWindow).set(36, 70, Tile.WallStoneWindow);
  // The apse end: lectern, braziers, and the Pilgrims' Mile — a
  // single woven runner the whole length of the nave.
  b.set(28, 78, Tile.Lectern);
  b.set(25, 78, Tile.Brazier).set(32, 78, Tile.Brazier);
  for (let y = 60; y <= 77; y++) {
    b.setDetail(28, y, Detail.Rug).setDetail(29, y, Detail.Rug);
  }
  b.set(23, 59, Tile.Bookshelf).set(35, 59, Tile.Cabinet);
  b.setDetail(26, 58, Detail.Tapestry).setDetail(31, 58, Detail.Tapestry);
  // East pews; the west aisle is the PILGRIM ALCOVE: cots and a
  // locker for road-worn travelers.
  for (const y of [63, 67, 71]) {
    b.set(32, y, Tile.Bench).set(33, y, Tile.Bench);
  }
  b.set(23, 63, Tile.Bed).set(24, 63, Tile.Bed);
  b.set(23, 67, Tile.Bed).set(24, 67, Tile.Bed);
  b.set(23, 71, Tile.Cabinet);
  b.set(24, 71, Tile.CloakStand); // pilgrim cloaks dry by the cots — the empty peg is somebody still walking
  b.set(26, 74, Tile.CandleStand); // lit for the ones on the road tonight
  b.setDetail(24, 64, Detail.RugRound).setDetail(24, 68, Detail.RugRound);
  // The registry corner: the book of who passed, by the door — the
  // third of the town's three books.
  b.set(33, 60, Tile.ScribesDesk).set(33, 61, Tile.Chair);
  b.setDetail(32, 60, Detail.RugRound);
  b.set(35, 60, Tile.Bed).set(35, 61, Tile.Bed); // Ansel's own cot, behind the registry desk
  b.set(25, 60, Tile.Brazier); // the lamp kept lit
  b.setDetail(28, 59, Detail.Doormat).setDetail(29, 59, Detail.Doormat);
  // The chapel yard and the stone walk from the spine.
  b.fillRect(28, 53, 2, 5, Tile.Path);
  b.set(26, 54, Tile.LampPost).set(32, 54, Tile.LampPost);
  b.set(25, 56, Tile.FlowerBox).set(33, 56, Tile.FlowerBox);
  b.sign(32, 55, "WAYKEEPERS' HALL", ['rest, register, remember']);
  // The memorial garden along the east wall: hedge line, the spring
  // fount the Waykeepers led down from the wall (the old hound worn
  // into its spout-stone), stone benches facing the morning.
  for (let y = 60; y <= 76; y++) b.set(40, y, Tile.Hedge);
  b.set(40, 66, Tile.HedgeGate);
  b.set(38, 63, Tile.StoneBench).set(38, 70, Tile.StoneBench);
  b.set(38, 68, Tile.WallFountain); // the led spring — the hall's quiet, given a voice
  b.setDetail(38, 66, Detail.Flowers).setDetail(39, 72, Detail.Flowers).setDetail(38, 61, Detail.Flowers);

  // ---------------------------------------------------------------
  // THE COMMONS — the southeast quarter inside the wall, homes
  // around a real green. Hedge lines are the garden
  // family's first outing anywhere in the world.
  // ---------------------------------------------------------------
  // The green itself.
  b.path({ x: 71, y: 62 }, { x: 71, y: 74 }, 2, Tile.Dirt); // the walk down from the Round
  for (let x = 62; x <= 80; x++) if (x !== 70 && x !== 71) b.set(x, 74, Tile.Hedge);
  b.set(70, 74, Tile.HedgeGate).set(71, 74, Tile.HedgeGate); // the arch over the walk
  b.fillRect(64, 79, 3, 2, Tile.Tilled);
  b.set(64, 79, Tile.CarrotMid).set(66, 80, Tile.SunflowerRipe);
  b.fillRect(75, 84, 3, 2, Tile.Tilled);
  b.set(75, 84, Tile.SunflowerMid).set(77, 85, Tile.CarrotRipe);
  b.set(70, 86, Tile.TreeOak); // the bench oak
  b.set(68, 87, Tile.Bench).set(72, 87, Tile.Bench);
  b.set(75, 80, Tile.LampPost);
  b.set(63, 84, Tile.Apiary); // the green's hive — Perl's bees commute
  // Cormund's house: the study window west, bookshelves and the desk
  // he thinks at, his bed across the room. Tidy front.
  b.fillRect(48, 76, 10, 8, Tile.WoodFloor);
  b.outlineRect(48, 76, 10, 8, Tile.WallWood);
  b.set(57, 79, Tile.DoorwayWood); // door east, facing the green
  b.set(50, 76, Tile.WallWoodWindow).set(54, 76, Tile.WallWoodWindow);
  b.set(48, 79, Tile.WallWoodWindow).set(52, 83, Tile.WallWoodWindow);
  b.set(49, 77, Tile.Bookshelf).set(50, 77, Tile.Bookshelf);
  b.set(49, 80, Tile.Table).set(50, 80, Tile.Chair); // the ledger desk
  b.set(55, 77, Tile.Bed);
  b.set(55, 82, Tile.Cabinet);
  b.setDetail(52, 79, Detail.Rug).setDetail(53, 79, Detail.Rug);
  b.setDetail(52, 80, Detail.Rug).setDetail(53, 80, Detail.Rug);
  b.setDetail(57, 78, Detail.Doormat);
  b.set(48, 75, Tile.FlowerBox).set(56, 75, Tile.FlowerBox);
  b.set(58, 79, Tile.Dirt).set(59, 79, Tile.Dirt);
  // Captain Aldis's: stone, spare, the only home in the diagonal
  // budget — corners cut like her tower. Her step faces the lane.
  b.fillRect(100, 76, 9, 8, Tile.StoneFloor);
  b.outlineRect(100, 76, 9, 8, Tile.WallStone);
  b.set(100, 83, Tile.WallStoneDiagNE).set(108, 83, Tile.WallStoneDiagNW);
  b.set(100, 79, Tile.DoorwayStone); // door west, toward the south lane
  b.set(104, 76, Tile.WallStoneWindow);
  b.set(108, 79, Tile.WallStoneWindow).set(104, 83, Tile.WallStoneWindow);
  b.set(101, 77, Tile.Bed);
  b.set(107, 77, Tile.WeaponRack);
  b.set(104, 80, Tile.Table).set(105, 80, Tile.Chair);
  b.set(107, 82, Tile.Cabinet);
  b.setDetail(101, 79, Detail.Doormat);
  b.setDetail(106, 76, Detail.BannerCrown);
  b.setDetail(103, 79, Detail.Rug).setDetail(104, 79, Detail.Rug);
  b.path({ x: 90, y: 79 }, { x: 99, y: 79 }, 1, Tile.Dirt); // her step to the lane
  // Master Tilo's house: shavings even at home — the half-finished
  // chair has been half-finished for three years and is TEACHING him.
  b.fillRect(62, 94, 9, 8, Tile.WoodFloor);
  b.outlineRect(62, 94, 9, 8, Tile.WallWood);
  b.set(66, 94, Tile.DoorwayWood);
  b.set(64, 94, Tile.WallWoodWindow).set(69, 94, Tile.WallWoodWindow);
  b.set(62, 98, Tile.WallWoodWindow).set(70, 98, Tile.WallWoodWindow);
  b.set(63, 95, Tile.Bed);
  b.set(69, 95, Tile.Cabinet);
  b.set(65, 98, Tile.Table).set(66, 98, Tile.Chair);
  b.set(63, 100, Tile.Chair); // the half-finished one
  b.set(69, 100, Tile.Crate);
  b.setDetail(64, 96, Detail.RugRound);
  b.setDetail(64, 99, Detail.Sawdust).setDetail(68, 100, Detail.Sawdust);
  b.setDetail(66, 95, Detail.Doormat);
  b.path({ x: 66, y: 89 }, { x: 66, y: 93 }, 1, Tile.Dirt);
  // THE WARDROOM — the watch's roof by the water gate: four bunks
  // worked in shifts, the duty table, racks, the hearth. The tower
  // commands; the wardroom sleeps.
  b.fillRect(92, 92, 11, 10, Tile.StoneFloor);
  b.outlineRect(92, 92, 11, 10, Tile.WallStone);
  b.set(92, 92, Tile.WallStoneDiagSE).set(102, 92, Tile.WallStoneDiagSW);
  b.set(92, 96, Tile.DoorwayStone); // door west onto the south lane
  b.set(96, 92, Tile.WallStoneWindow).set(99, 92, Tile.WallStoneWindow);
  b.set(102, 96, Tile.WallStoneWindow).set(96, 101, Tile.WallStoneWindow);
  b.set(94, 93, Tile.Bed).set(94, 94, Tile.Bed);
  b.set(100, 93, Tile.Bed).set(100, 94, Tile.Bed);
  b.set(94, 97, Tile.Bed).set(94, 98, Tile.Bed);
  b.set(100, 97, Tile.Bed).set(100, 98, Tile.Bed);
  b.set(97, 96, Tile.Table); // the duty table
  b.set(94, 100, Tile.WeaponRack).set(100, 100, Tile.WeaponRack);
  b.set(97, 100, Tile.Hearth);
  b.setDetail(93, 96, Detail.Doormat);
  b.setDetail(96, 95, Detail.Rug).setDetail(97, 95, Detail.Rug);
  b.setDetail(98, 92, Detail.BannerCrown);
  b.set(90, 94, Tile.LampPost); // lit for the changing of the guard
  b.sign(93, 91, 'THE WARDROOM', ['the watch sleeps in shifts'], Tile.HangingSign);
  // The farmhouse (Jorel & Tamsin) — inside the Fordgate corner,
  // facing its own fields across the wall: hearth hall west with the
  // kitchen corner, the bedroom east through its own door, the coop
  // and dovecote in the yard.
  b.fillRect(18, 86, 14, 10, Tile.WoodFloor);
  b.outlineRect(18, 86, 14, 10, Tile.WallWood);
  b.set(24, 86, Tile.DoorwayWood);
  b.set(21, 86, Tile.WallWoodWindow).set(28, 86, Tile.WallWoodWindow);
  b.set(18, 90, Tile.WallWoodWindow).set(31, 91, Tile.WallWoodWindow);
  b.set(22, 95, Tile.WallWoodWindow).set(27, 95, Tile.WallWoodWindow);
  for (let y = 87; y <= 94; y++) b.set(26, y, Tile.WallWood);
  b.set(26, 90, Tile.DoorwayWood);
  b.set(19, 87, Tile.Hearth);
  b.set(21, 90, Tile.Table).set(22, 90, Tile.Table); // the long farm table
  b.set(20, 90, Tile.Chair).set(23, 90, Tile.Chair);
  b.set(19, 92, Tile.Counter).set(19, 93, Tile.Counter).set(19, 94, Tile.Basin);
  for (let x = 20; x <= 23; x++) {
    b.setDetail(x, 88, Detail.Rug).setDetail(x, 89, Detail.Rug); // the good rug — no muddy boots
  }
  b.setDetail(24, 87, Detail.Doormat);
  b.set(29, 88, Tile.Bed).set(29, 89, Tile.Bed);
  b.set(29, 91, Tile.Bed).set(29, 92, Tile.Bed);
  b.set(27, 87, Tile.Cabinet);
  b.setDetail(27, 89, Detail.Rug).setDetail(28, 89, Detail.Rug);
  b.path({ x: 24, y: 82 }, { x: 24, y: 85 }, 1, Tile.Dirt);
  b.setDetail(20, 86, trellisDetail(0)); // the climbing rose on the hall's north face
  // The coop: the hens go where they please; the dovecote watches.
  b.outlineRect(36, 88, 9, 8, Tile.Fence);
  b.fillRect(37, 89, 7, 6, Tile.Dirt);
  b.set(36, 92, Tile.FenceGate);
  b.setDetail(39, 90, Detail.Straw).setDetail(42, 93, Detail.Straw);
  b.set(43, 86, Tile.Dovecote);
  b.set(34, 92, Tile.Dirt).set(35, 92, Tile.Dirt);
  b.set(33, 88, Tile.HayBale);
  b.set(33, 91, Tile.Woodpile); // the house's winter, stacked between hall and coop
  // Tamsin's kitchen garden, south of the house — the hedge gets
  // shears, the hens get rail: greens for the table inside a clipped
  // ring, because the Free Furrows feed strangers and this feeds HERS.
  b.outlineRect(20, 97, 7, 5, Tile.Hedge);
  b.set(23, 97, Tile.HedgeGate);
  for (const x of [21, 22, 23, 24]) {
    b.set(x, 98, x % 2 === 1 ? Tile.CarrotRipe : Tile.Tilled);
    b.set(x, 100, x % 2 === 1 ? Tile.Tilled : Tile.SagewortMid);
  }
  b.set(25, 100, Tile.CompostBin);

  // ---------------------------------------------------------------
  // THE TOWN WALL — the Toll War's long lesson, re-drawn around the
  // TOWN alone: the fields, the delf, the orchard, and the river
  // quarter breathe outside it now. Same laws: separate masonry
  // (the curtain dies into Aldis's tower), corner cuts chained with
  // the solid triangle pointing INTO town, gates authored OPEN.
  // Four road gates plus the miners' postern in the east curtain.
  // ---------------------------------------------------------------
  // North curtain, dying honestly into the tower's own stone; the
  // North Gate opens between the tower and the east run.
  b.fillRect(19, 8, 42, 1, Tile.WallGarrison); // x19-60, to the tower's west shoulder
  b.set(68, 8, Tile.GateGarrison).set(69, 8, Tile.GateGarrison).set(70, 8, Tile.GateGarrison);
  b.fillRect(71, 8, 51, 1, Tile.WallGarrison); // x71-121
  // West curtain, Fordgate at the spine.
  b.fillRect(16, 11, 1, 39, Tile.WallGarrison); // y11-49
  b.set(16, 50, Tile.GateGarrison).set(16, 51, Tile.GateGarrison).set(16, 52, Tile.GateGarrison);
  b.fillRect(16, 53, 1, 49, Tile.WallGarrison); // y53-101
  // East curtain: the postern for the delf, the East Gate on the road.
  b.fillRect(124, 11, 1, 9, Tile.WallGarrison); // y11-19
  b.set(124, 20, Tile.GateGarrison).set(124, 21, Tile.GateGarrison); // the miners' postern
  b.fillRect(124, 22, 1, 48, Tile.WallGarrison); // y22-69
  b.set(124, 70, Tile.GateGarrison).set(124, 71, Tile.GateGarrison).set(124, 72, Tile.GateGarrison);
  b.fillRect(124, 73, 1, 29, Tile.WallGarrison); // y73-101
  // South curtain, the water gate over the quay lane.
  b.fillRect(19, 104, 66, 1, Tile.WallGarrison); // x19-84
  b.set(85, 104, Tile.GateGarrison).set(86, 104, Tile.GateGarrison);
  b.set(87, 104, Tile.GateGarrison).set(88, 104, Tile.GateGarrison);
  b.fillRect(89, 104, 33, 1, Tile.WallGarrison); // x89-121
  // The corner cuts.
  b.set(18, 9, Tile.WallGarrisonDiagSE).set(17, 10, Tile.WallGarrisonDiagSE);
  b.set(122, 9, Tile.WallGarrisonDiagSW).set(123, 10, Tile.WallGarrisonDiagSW);
  b.set(123, 102, Tile.WallGarrisonDiagNW).set(122, 103, Tile.WallGarrisonDiagNW);
  b.set(17, 102, Tile.WallGarrisonDiagNE).set(18, 103, Tile.WallGarrisonDiagNE);
  // Gate furniture: watch fires and the plain words.
  b.set(14, 49, Tile.Brazier).set(14, 53, Tile.Brazier);
  b.sign(12, 49, 'DAWNMEAD', ['west, by the First Road'], Tile.Signpost);
  b.sign(13, 55, 'AMBERFORD', ['the ford holds', 'the lamp stays lit'], Tile.Signpost);
  b.set(83, 106, Tile.Brazier).set(91, 106, Tile.Brazier);
  b.set(126, 69, Tile.LampPost);
  b.sign(127, 73, 'THE EAST ROAD', ['Pinewatch, by the Timber Road', 'the long way is the lamped way'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE WEST COUNTRY — Furrowfield and the Free Furrows, working
  // ground along the First Road outside the Fordgate, dressed at
  // last with the farm kit it always deserved.
  // ---------------------------------------------------------------
  // Furrowfield: the family fields, north of the road.
  b.outlineRect(2, 30, 13, 17, Tile.Fence);
  b.set(8, 46, Tile.FenceGate); // gate south to the road
  for (let y = 32; y <= 44; y += 2) {
    for (let x = 4; x <= 12; x++) {
      if (x % 2 === 0) b.set(x, y, Tile.Tilled);
      else if (y <= 34) b.set(x, y, Tile.WheatRipe);
      else if (y <= 38) b.set(x, y, Tile.WheatMid);
      else if (y <= 42) b.set(x, y, Tile.CarrotRipe);
      else b.set(x, y, Tile.CottonMid);
    }
  }
  b.set(8, 38, Tile.Scarecrow);
  b.set(3, 31, Tile.Silo);
  b.set(12, 31, Tile.HayBale).set(11, 32, Tile.HayBale);
  b.set(11, 45, Tile.Wheelbarrow); // left mid-row, soil still in the box — the field is a workplace
  b.set(3, 45, Tile.CompostBin);
  b.sign(1, 48, 'FURROWFIELD', ['the Furrowfields’ ground', 'mind the scarecrow, he minds you'], Tile.Signpost);
  b.set(8, 47, Tile.Dirt).set(8, 48, Tile.Dirt).set(8, 49, Tile.Dirt);
  // The Free Furrows: common ground, gate on the road — the first
  // farm a traveler is allowed to touch.
  b.outlineRect(2, 56, 13, 12, Tile.Fence);
  b.set(8, 56, Tile.FenceGate);
  for (const x of [4, 6, 8, 10, 12]) {
    b.set(x, 59, Tile.Tilled);
    b.set(x, 62, Tile.Tilled);
    b.set(x, 65, Tile.Tilled);
  }
  b.set(4, 59, Tile.CarrotMid).set(8, 62, Tile.WheatMid).set(12, 65, Tile.SunflowerMid);
  b.set(13, 57, Tile.WaterCask); // the water cask — drawn from the meadow spring, tapped by whoever needs it
  b.set(3, 66, Tile.CompostBin);
  b.sign(1, 55, 'THE FREE FURROWS', ['common ground', 'plant what you will, waker'], Tile.Signpost);
  b.set(8, 54, Tile.Dirt).set(8, 55, Tile.Dirt);

  // ---------------------------------------------------------------
  // THE EAST COUNTRY — the delf, the pasture, and the orchard, out
  // where a town keeps its working land: past the east curtain,
  // under the open sky.
  // ---------------------------------------------------------------
  // The Amber Delf: the old cutting, up the postern trail.
  b.fillEllipse(135, 20, 7, 8, Tile.Dirt);
  b.set(131, 15, Tile.RockCopper).set(138, 14, Tile.RockCopper);
  b.set(133, 25, Tile.RockTin).set(140, 19, Tile.RockTin);
  b.set(139, 26, Tile.RockIron); // the better-pick face
  b.set(130, 21, Tile.Rock).set(136, 28, Tile.Rock); // spoil
  b.set(134, 22, Tile.Wheelbarrow); // the spoil barrow, parked where the last load stopped
  b.set(130, 13, Tile.Crate).set(130, 14, Tile.WaterCask); // the work corner — a miner's thirst is half the wage
  b.set(129, 24, Tile.LampPost); // the early shift's lamp
  b.setDetail(134, 17, Detail.Pebbles).setDetail(137, 22, Detail.Pebbles).setDetail(132, 23, Detail.Pebbles);
  b.sign(127, 17, 'THE AMBER DELF', ['copper and tin for the forge', 'the iron face wants a better pick'], Tile.Signpost);
  // Holloway pasture: the cows Perl is at war with. The cows are
  // winning; the gate latch knows things a latch should not.
  b.outlineRect(128, 40, 14, 19, Tile.Fence);
  b.set(134, 58, Tile.FenceGate); // gate south, trail to the east street
  b.set(130, 43, Tile.WaterTrough);
  b.set(129, 42, Tile.Crate); // the milking corner
  b.set(139, 42, Tile.HayBale);
  b.setDetail(133, 47, Detail.Straw).setDetail(137, 52, Detail.Straw).setDetail(131, 55, Detail.Straw);
  b.sign(126, 60, 'HOLLOWAY PASTURE', ['fresh milk — mind the cows'], Tile.Signpost);
  b.path({ x: 130, y: 68 }, { x: 134, y: 60 }, 1, Tile.Dirt);
  // Perl's orchard: real apple rows at last, plum interplants, the
  // berry hedge on the road, her cottage among the trees, the press
  // and the hives by her dooryard.
  for (const y of [76, 81, 86, 91, 96]) {
    for (const x of [128, 133, 138, 142]) {
      if (x >= 131 && x <= 141 && y >= 81 && y <= 91) continue; // her dooryard
      const plum = (x + y) % 3 === 0;
      const young = (x * 7 + y) % 5 === 0; // a few young grafts among the bearers
      b.set(x, y, plum ? (young ? Tile.PlumTreeMid : Tile.PlumTreeRipe) : young ? Tile.AppleTreeMid : Tile.AppleTreeRipe);
    }
  }
  b.set(126, 78, Tile.BerryBush).set(126, 88, Tile.BerryBush).set(127, 97, Tile.BerryBush);
  b.fillRect(132, 82, 9, 8, Tile.WoodFloor);
  b.outlineRect(132, 82, 9, 8, Tile.WallWood);
  b.set(132, 85, Tile.DoorwayWood); // door west, toward the road
  b.set(135, 82, Tile.WallWoodWindow).set(139, 82, Tile.WallWoodWindow);
  b.set(140, 86, Tile.WallWoodWindow).set(136, 89, Tile.WallWoodWindow);
  b.set(138, 83, Tile.Bed).set(138, 84, Tile.Bed);
  b.set(139, 88, Tile.Cabinet);
  b.set(134, 87, Tile.Table).set(135, 87, Tile.Chair);
  b.setDetail(134, 84, Detail.Rug).setDetail(135, 84, Detail.Rug); // the braided square, apple-cider colors
  b.setDetail(133, 85, Detail.Doormat);
  b.setDetail(137, 82, trellisDetail(2));
  b.set(129, 84, Tile.FruitPress);
  b.set(130, 86, Tile.BasketStack); // windfalls by the basket, exactly as the sign promises
  b.set(129, 92, Tile.Apiary);
  b.set(137, 90, Tile.LeanLadder); // the picking ladder against her south eave, sickle on the third rung
  b.set(131, 80, Tile.FlowerBox);
  b.sign(128, 74, "PERL'S ORCHARD", ['windfalls by the basket', 'shade is free, the apples are not'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE FORD QUARTER — through the water gate, the town steps down
  // to the river it was named for. Upstream of the bridge: work.
  // Downstream: memory.
  // ---------------------------------------------------------------
  // Garton's mill, moved off its pond onto the true current: the
  // milling floor south against the water, the flour shop fronting
  // the quay walk, and the millrace lapping the east wall where the
  // wheel will hang (the wheel is still on the mason's list; the
  // water already stands where it will turn).
  b.fillRect(52, 108, 15, 11, Tile.WoodFloor);
  b.outlineRect(52, 108, 15, 11, Tile.WallWood);
  b.set(58, 108, Tile.DoorwayWood); // door north on the quay walk
  b.set(54, 108, Tile.WallWoodWindow).set(62, 108, Tile.WallWoodWindow);
  b.set(52, 112, Tile.WallWoodWindow).set(52, 116, Tile.WallWoodWindow);
  b.set(66, 111, Tile.WallWoodWindow).set(60, 118, Tile.WallWoodWindow);
  for (let x = 53; x <= 65; x++) b.set(x, 113, Tile.WallWood);
  b.set(58, 113, Tile.DoorwayWood); // shop <-> milling floor
  // The flour shop.
  b.set(55, 110, Tile.Counter).set(56, 110, Tile.Counter);
  b.set(62, 110, Tile.GrainSacks).set(63, 111, Tile.CrateGoods); // flour by the sack, and honestly IN sacks
  b.setDetail(58, 109, Detail.Doormat);
  b.setDetail(56, 111, Detail.Rug).setDetail(57, 111, Detail.Rug);
  // The milling floor: the stone, the grain, straw on everything.
  b.set(57, 116, Tile.Workbench); // the millstone's station
  b.set(53, 115, Tile.GrainSacks).set(54, 115, Tile.Crate); // the grain waiting its turn
  b.set(64, 117, Tile.Barrel);
  b.set(63, 114, Tile.Bed).set(63, 115, Tile.Bed); // a miller sleeps where the grain does
  b.setDetail(59, 115, Detail.Straw).setDetail(55, 117, Detail.Straw).setDetail(62, 115, Detail.Straw);
  b.setDetail(56, 108, bracketSignDetail(5)); // the flour-sack shingle on the wall
  b.sign(53, 107, "GARTON'S MILL", ['flour, meal, and gossip']);
  // The millrace: cut through the bank to lap the east wall.
  b.fillRect(67, 114, 2, 8, Tile.WaterShallow);
  b.set(67, 113, Tile.RailWood).set(68, 113, Tile.RailWood);
  b.set(69, 116, Tile.RailWood).set(69, 119, Tile.RailWood);
  // The quay: the stone esplanade between the water gate and the
  // bank, the dock planks, the moorings, and the fish market.
  b.fillRect(74, 108, 21, 9, Tile.StoneFloor);
  // The dock planks HUG the waterline east of the bridge — the ford
  // side stays open bank, because nobody planks over the town's
  // first tool. The bank slopes east and the planks slope with it.
  for (let x = 89; x <= 94; x++) {
    const yn = 114 + Math.round(x * 0.115 + Math.sin(x * 0.21) * 1.5);
    b.set(x, yn - 1, Tile.Dock);
    b.set(x, yn, Tile.Dock);
  }
  b.fillRect(91, 123, 3, 4, Tile.Dock); // the jetty finger to deep water
  b.set(95, 125, Tile.MooringPost); // the mooring, lead coiled to the tide mark
  b.set(98, 125, Tile.BeachedSkiff); // a fisher's boat drawn up beside it, keel furrow still fresh
  // The fish market — no borrowed stall here: the wet-straw slab the
  // trade deserves, the catch weighed in the open, baskets landing
  // straight off the planks.
  b.set(76, 110, Tile.FishmongerSlab); // the morning's catch on wet straw
  b.set(74, 110, Tile.HangingScale); // weighed while the buyer watches the river it came from
  b.set(78, 111, Tile.BasketStack); // baskets up from the jetty, one lid tipped
  b.set(82, 111, Tile.Campfire); // THE CATCH FIRE — the shore's own coals
  b.set(80, 110, Tile.Bench).set(84, 112, Tile.Bench);
  b.set(80, 113, Tile.ToolRack); // nets and boathooks
  b.set(74, 112, Tile.CrateStack); // cargo landed and waiting its cart
  b.set(75, 115, Tile.HandCart); // the quay cart, shafts down between loads
  b.sign(85, 109, 'THE CATCH FIRE', ['fresh off the river, hot coals', 'cook your own'], Tile.Signpost);
  b.set(75, 108, Tile.LampPost).set(93, 108, Tile.LampPost);
  b.set(94, 128, Tile.FishingSpot); // off the jetty end, in the current
  b.set(89, 126, Tile.FishingSpot); // beside the planks, in the slack
  // Peld's ferry landing, east along the bank: his shack, the lamp
  // lit late, the bell, and the punt planks — a real river to pole
  // down someday, and Saltmere at the end of it.
  b.fillRect(108, 108, 8, 6, Tile.WoodFloor);
  b.outlineRect(108, 108, 8, 6, Tile.WallWood);
  b.set(108, 110, Tile.DoorwayWood); // door west
  b.set(111, 108, Tile.WallWoodWindow).set(115, 111, Tile.WallWoodWindow);
  b.set(113, 109, Tile.Bed).set(113, 110, Tile.Bed);
  b.set(109, 112, Tile.Crate).set(110, 109, Tile.Barrel);
  b.setDetail(111, 111, Detail.RugRound); // the one soft thing Peld owns
  b.set(106, 109, Tile.StreetLantern); // the ferry lantern, lit late, swinging on its ring
  b.set(106, 113, Tile.ToolRack);
  b.set(105, 115, Tile.TownBell); // 'ring for Peld' — at last, a bell to ring
  b.set(104, 120, Tile.BeachedSkiff); // the punt itself, hauled out, dye on the sheer strake — Saltmere can wait one more season
  b.fillRect(110, 122, 3, 5, Tile.Dock); // the punt planks, down to the current
  b.set(109, 122, Tile.RailWood);
  b.set(113, 123, Tile.MooringPost); // tarred oak leaning a hair riverward
  b.sign(107, 116, 'THE CROSSING', ['ring for Peld', 'downriver: Saltmere, someday'], Tile.Signpost);
  // THE TANNERY (Swale) — leather made where leather is made: on the
  // bank, downstream, downwind, and honest about all three. Frames
  // and racks in the yard, lime by the door, the smell a courtesy
  // she extends and expects.
  b.fillRect(119, 110, 12, 8, Tile.WoodFloor);
  b.outlineRect(119, 110, 12, 8, Tile.WallWood);
  b.set(119, 113, Tile.DoorwayWood); // door west, off the quay walk
  b.set(122, 110, Tile.WallWoodWindow).set(127, 110, Tile.WallWoodWindow);
  b.set(130, 113, Tile.WallWoodWindow).set(124, 117, Tile.WallWoodWindow);
  b.set(121, 111, Tile.TanningRack);
  b.set(125, 111, Tile.Workbench); // the cutting bench
  b.set(127, 111, Tile.Cabinet); // the finished straps
  b.set(129, 111, Tile.Bed).set(129, 112, Tile.Bed); // Swale's cot, upwind end
  b.setDetail(128, 113, Detail.RugRound);
  b.set(120, 116, Tile.Barrel).set(121, 116, Tile.Barrel); // the lime
  b.set(127, 116, Tile.Crate);
  b.setDetail(123, 113, Detail.Rug).setDetail(124, 113, Detail.Rug);
  b.setDetail(120, 113, Detail.Doormat);
  // The frame yard, south to the waterline.
  b.set(121, 120, Tile.HideFrame).set(125, 120, Tile.HideFrame);
  b.set(128, 120, Tile.DryingRack);
  b.set(123, 123, Tile.TanningRack);
  b.set(124, 122, Tile.WoodStool); // Swale sits to the wet work — her knees set the terms of the trade
  b.setDetail(122, 121, Detail.Straw).setDetail(126, 122, Detail.Straw);
  b.sign(116, 110, 'THE TANNERY', ['hides in, leather out', 'the smell is included'], Tile.Signpost);
  // The retting bank, past the tannery: flax cut, soaked, and spun —
  // the loom's whole supply line in forty feet of slack water.
  b.set(132, 122, Tile.FibrePlant).set(134, 125, Tile.FibrePlant).set(130, 127, Tile.FibrePlant);
  b.sign(133, 119, 'THE RETTING BANK', ['flax for the loom', 'cut what you need'], Tile.Signpost);
  // THE FORD DOOR (the Red Company): the slack reeds nobody visits,
  // downstream of the tannery smell. A hatch, a barrel, no lamp, no
  // sign, no name. World (578,70); lowhall.ts points here.
  b.fillRect(128, 124, 5, 4, Tile.Dirt);
  b.portal(130, 126, Tile.PortalDown, { x: 217.5, y: 568.5 }); // the Amberford alcove below
  b.set(132, 125, Tile.Barrel).set(128, 127, Tile.Crate);
  b.setDetail(129, 125, Detail.Pebbles).setDetail(131, 124, Detail.Tuft);
  b.set(133, 124, Tile.Swamp).set(127, 126, Tile.Swamp);
  // THE BRIDGE AND THE OLD FORD — the crossing that names the town.
  // The Salt Road takes the stone deck; the sandbar ford wades
  // beside it, kept the way a family keeps its first tool. The OLD
  // HOUND stands twice at the north approach — the carved pair
  // (mirrored by the tile parity law) watching every crossing the
  // way the living one watched the first: the ford holds, and these
  // two are why anyone believes it.
  for (let x = 85; x <= 88; x++) {
    for (let y = 122; y <= 134; y++) b.set(x, y, Tile.Bridge);
  }
  b.set(84, 120, Tile.GuardianStatue).set(89, 120, Tile.GuardianStatue); // one clear row above the rails — stone reads best with air around it
  b.set(89, 117, Tile.StreetLantern); // the approach lantern on the quay lane's shoulder
  b.set(84, 122, Tile.RailWood).set(89, 122, Tile.RailWood);
  b.set(84, 134, Tile.RailWood).set(89, 134, Tile.RailWood);
  for (let x = 78; x <= 82; x++) {
    for (let y = 121; y <= 132; y++) {
      const t = b.get(x, y);
      if (t === Tile.Water || t === Tile.WaterDeep || t === Tile.WaterShallow) b.set(x, y, Tile.WaterShallow);
    }
  }
  b.setDetail(79, 120, Detail.Pebbles).setDetail(81, 133, Detail.Pebbles);
  b.sign(80, 119, 'THE OLD FORD', ['here the amber water ran shallow,', 'and a town grew on the crossing'], Tile.Signpost);
  b.set(90, 128, Tile.EelRun); // the eels hold in the bridge shadow
  // The south bank: the far gatepost, the road walking off to the
  // salt country, the wayside shrine every carter touches before the
  // mere country gets its say, and the reeds keeping their own counsel.
  b.fillRect(86, 135, 3, 9, Tile.Path); // the Salt Road to the hem — head (536,88)
  b.set(80, 136, Tile.WayShrine); // posy, bread heel, two coins — go fed, go armed, go remembered
  b.set(84, 137, Tile.Brazier).set(90, 137, Tile.Brazier);
  b.sign(90, 139, 'THE SALT ROAD', ['to Saltmere and the mere country', 'go fed, go armed, go by day'], Tile.Signpost);
  b.sign(81, 140, 'AMBERFORD', ['the ford holds'], Tile.Signpost);
  b.set(78, 138, Tile.Swamp).set(93, 141, Tile.Swamp);
  b.set(76, 140, Tile.FibrePlant).set(95, 139, Tile.FibrePlant);

  // The water meadows west of the mill: willows, sheep, and the long
  // grass down to the bank.
  b.set(8, 108, Tile.TreeWillow).set(24, 112, Tile.TreeWillow).set(40, 111, Tile.TreeWillow);
  b.set(46, 116, Tile.TreeWillow).set(70, 108, Tile.TreeWillow);
  b.set(100, 120, Tile.TreeWillow).set(135, 112, Tile.TreeWillow);
  b.set(14, 111, Tile.FibrePlant).set(31, 113, Tile.FibrePlant);

  // ---------------------------------------------------------------
  // Meadow life, lamps for the dark corners, then the soft edges.
  // ---------------------------------------------------------------
  b.set(44, 24, Tile.TreeOak); // the smiths' lunch oak
  b.set(43, 25, Tile.Bench);
  b.set(20, 49, Tile.LampPost).set(40, 49, Tile.LampPost); // the west spine
  b.set(66, 24, Tile.LampPost).set(72, 38, Tile.LampPost); // the north spine
  b.set(100, 69, Tile.LampPost).set(114, 69, Tile.LampPost); // the east street
  b.set(84, 80, Tile.LampPost).set(84, 94, Tile.LampPost); // the south lane
  b.set(45, 30, Tile.LampPost); // the bank corner
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.04);
  b.scatterDetail(Detail.Tuft, 0.06);
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 51) <= 4 && x < 18) continue; // the Fordgate breathes
      if (Math.abs(x - 69) <= 4 && y < 10) continue; // the North Gate breathes
      if (Math.abs(y - 71) <= 4 && x > 122) continue; // the East Gate breathes
      if (Math.abs(x - 87) <= 4 && y > 102) continue; // the water gate breathes
      if (x >= 1 && x <= 15 && y >= 29 && y <= 69) continue; // the west fields
      if (x >= 125 && y >= 10 && y <= 100) continue; // the east country works
      if (y >= 105) continue; // the river country plants its own
      if (x >= 17 && x <= 123 && y >= 9 && y <= 103) continue; // inside the walls, the town decides
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.28 : edge < 7 ? 0.1 : 0.02;
      if (fordRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // ---------------------------------------------------------------
  // THE PEOPLE — eighteen named lives and the watch on the town's
  // own clock. Placements are the POST each routine measures from.
  // ---------------------------------------------------------------
  b.actor('smith_bretta', 26.5, 16.5, Math.PI / 2, 'amber_smith');
  b.actor('master_tilo', 55.5, 40.5, Math.PI / 2, 'amber_artisan');
  b.actor('sage_elowen', 77.5, 35.5, Math.PI, 'amber_sage');
  b.actor('banker_cormund', 34.5, 39.3, Math.PI / 2, 'amber_banker');
  b.actor('innkeep_dunna', 98.5, 51.5, Math.PI, 'amber_innkeep');
  b.actor('miller_garton', 57.5, 115.5, -Math.PI / 2, 'amber_miller');
  b.actor('ferryman_peld', 111.5, 117.5, Math.PI / 2, 'amber_ferryman');
  b.actor('grocer_merra', 50.5, 59.3, Math.PI / 2, 'amber_grocer');
  b.actor('outfitter_hask', 46.5, 15.5, 0, 'amber_outfitter');
  b.actor('captain_aldis', 64.5, 12.5, Math.PI / 2, 'amber_captain');
  b.actor('registrar_rowan', 75.5, 12.5, Math.PI / 2, 'amber_registrar');
  b.actor('hostler_bray', 86.5, 18.5, 0, 'amber_hostler');
  b.actor('tanner_swale', 123.5, 113.5, Math.PI, 'amber_tanner');
  b.actor('farmer_jorel', 8.5, 38.5, Math.PI / 2, 'amber_farmer');
  b.actor('farmer_tamsin', 40.5, 91.5, 0, 'amber_farmwife');
  b.actor('keeper_ansel', 28.5, 76.5, -Math.PI / 2, 'amber_keeper');
  b.actor('orchardist_perl', 135.5, 78.5, Math.PI / 2, 'amber_orchardist');
  b.actor('courier_nib', 74.5, 55.5, 0, 'amber_courier');
  // THE CHANGING OF THE GUARD: every gate keeps a day and a night
  // sentry who hand over at the gate itself; the round pair walks
  // the streets in opposite halves of the clock. Day sentries sleep
  // the wardroom and tower bunks by night, night sentries by day.
  b.actor('amberford_watch', 17.5, 49.5, Math.PI, 'amber_watch_ford_day');
  b.actor('amberford_watch', 17.5, 53.5, Math.PI, 'amber_watch_ford_night');
  b.actor('amberford_watch', 69.5, 9.5, -Math.PI / 2, 'amber_watch_north_day');
  b.actor('amberford_watch', 68.5, 10.5, -Math.PI / 2, 'amber_watch_north_night');
  b.actor('amberford_watch', 123.5, 70.5, 0, 'amber_watch_east_day');
  b.actor('amberford_watch', 123.5, 72.5, 0, 'amber_watch_east_night');
  b.actor('amberford_watch', 87.5, 102.5, Math.PI / 2, 'amber_watch_salt_day');
  b.actor('amberford_watch', 86.5, 102.5, Math.PI / 2, 'amber_watch_salt_night');
  b.actor('amberford_watch', 72.5, 47.5, Math.PI / 2, 'amber_watch_round_day');
  b.actor('amberford_watch', 72.5, 58.5, Math.PI / 2, 'amber_watch_round_night');
  // The traveling traders: the produce row by day, the guest wing by
  // night — the market has voices.
  b.actor('round_trader', 63.0, 49.8, Math.PI / 2, 'amber_trader_a');
  b.actor('round_trader', 67.0, 49.8, Math.PI / 2, 'amber_trader_b');

  // The animals — the town's working livestock, and the caravan oxen
  // boarding at Bray's yard between roads.
  b.npcSpawn('cow', 134, 49.5, 3, 3);
  b.npcSpawn('cow', 92, 17.5, 2.5, 2);
  b.npcSpawn('chicken', 40, 91.5, 1.6, 4);
  b.npcSpawn('sheep', 20, 108.5, 4, 3);

  // Respawn hearth for the eastern lowlands: the Round, by the well.
  b.spawn(74.5, 53.5);
  return b.build();
}

/** Stable per-tile randomness so the town is identical every boot. */
function fordRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
