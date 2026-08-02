import { Detail, Tile, awningTile, bracketSignDetail, pennantDetail, trellisDetail } from '@arx/shared';
import { SALTMERE_RECT } from '../geography.js';
import { MARKET_STALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Saltmere — the town at the water's end, the Dawnlands' southern
 * hearth-that-isn't: a HAVEN on the north shore of the great brack
 * mere, where the land finally runs out and the Salt Road stops
 * because there is nowhere left to go. Peld the ferryman walked up
 * from here when he was small; the salt on Silverfall's tables walks
 * the other way. Level 15+ country: the road south earns the town.
 *
 * THE TOWN-PLAN LAW (inherited from Amberford, kept whole):
 *  - STREETS FIRST. One spine — the Brinewalk, gate to quay — with
 *    the Portreeve's lane, two east lanes, and the Salters' Lane
 *    hung off it. Every building fronts a street, a lane, or the
 *    working shore; gaps between structures stay >= 3 open tiles.
 *  - A DIAGONAL BUDGET of zero. Saltmere is a working port built by
 *    fishermen with wet rope and no patience: every wall is honest
 *    and square. The town's flourish is the water itself.
 *  - ROOM INTENT. One job per room, furniture proves it.
 *
 * THE SHORE PLAN — the mere is the town's fourth wall and its whole
 * reason: the garrison curtain rings only the three land sides and
 * WADES INTO THE WATER at both ends (the harbor-mole read; the east
 * wall shelters the boatwright's strand behind it, so the waterline
 * steps at the wall seam ON PURPOSE). West to east along the shore:
 * reed edge, the salt pans on their sand flats, the Mere Light's
 * islet off the pans, the stone quay with three timber piers, the
 * smokehouse shore, the boatwright's strand and slipway, reed edge.
 * The south border rows are open water: the water edge class carries
 * the mere out into the wild, and the SALT_FLATS fen heart continues
 * it to the far shore (tier 4-5 country, lit but never tamed).
 *
 * THE TRADES (what Saltmere has that nowhere else does): the pans
 * (salt, the town's word for money), the smokehouses (the world's
 * first COOKING TRAINER, Smokemistress Alba), the ropewalk, the
 * boatwright's slipway where every hull gets its painted eyes, and
 * the deepest fishing on the map. Essentials shared with any town:
 * the Counting House (bank), the Painted Gull (inn), Saltmere Stores
 * (chandlery). The Watch House flies the Waykeepers' lamp — this is
 * their port, not the Charter's and not the Crown's.
 *
 * Anchors that must NOT move (routines hang off them): the gate at
 * local x52-54/y2, the quay square and its stalls, the pier tips and
 * their fishing spots, every station tile, every door, every bed,
 * and the Mere Light's islet. The Salt Road lands at world (354,256)
 * = local (54,4); the mouth Path rows y0-1 meet the carved road.
 */
export function buildSaltmere(): ZoneDef {
  const R = SALTMERE_RECT;
  const b = new ZoneBuilder('saltmere', 'Saltmere', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE SHORE — water first: the mere decides everything else.
  // shoreY per segment; deep water six rows past the line. Natural
  // segments get a one-tile wobble so no ruler ever touched them.
  // ---------------------------------------------------------------
  const shoreAt = (x: number): number => {
    if (x <= 7) return 54 + Math.round(Math.sin(x * 0.9)); // west reeds
    if (x <= 34) return 60; // the pans' flats run far out
    if (x <= 39) return 54 + Math.round(Math.sin(x * 0.7)); // transition
    if (x <= 76) return 52; // the quay's dressed stone line
    if (x <= 93) return 53 + Math.round(Math.sin(x * 0.8)); // smokehouse shore
    if (x <= 102) return 57; // the sheltered strand behind the mole
    return 50 + Math.round(Math.sin(x * 0.9)); // east reeds, outside the wall
  };
  for (let x = 0; x < R.w; x++) {
    const s = shoreAt(x);
    for (let y = s; y < R.h; y++) {
      b.set(x, y, y >= s + 6 ? Tile.WaterDeep : Tile.Water);
    }
  }
  // Sand: the worked ground between grass and water.
  for (let x = 0; x <= 7; x++) for (let y = 46; y < shoreAt(x); y++) b.set(x, y, Tile.Sand);
  for (let x = 8; x <= 34; x++) for (let y = 44; y < 60; y++) b.set(x, y, Tile.Sand);
  for (let x = 35; x <= 43; x++) for (let y = 46; y < shoreAt(x); y++) b.set(x, y, Tile.Sand);
  for (let x = 77; x <= 93; x++) for (let y = 47; y < shoreAt(x); y++) b.set(x, y, Tile.Sand);
  for (let x = 94; x <= 102; x++) for (let y = 48; y < 57; y++) b.set(x, y, Tile.Sand);
  for (let x = 103; x < R.w; x++) for (let y = 46; y < shoreAt(x); y++) b.set(x, y, Tile.Sand);
  // Reed edges: brack marsh where nobody works, flax where they do.
  b.set(2, 50, Tile.Swamp).set(3, 51, Tile.Swamp).set(5, 52, Tile.Swamp).set(1, 52, Tile.Swamp);
  b.set(3, 48, Tile.FibrePlant).set(6, 47, Tile.FibrePlant);
  b.set(106, 48, Tile.Swamp).set(109, 47, Tile.Swamp).set(105, 49, Tile.Swamp);
  b.set(105, 46, Tile.FibrePlant).set(108, 45, Tile.FibrePlant);

  // ---------------------------------------------------------------
  // THE STREETS — the Brinewalk first, then everything it feeds.
  // ---------------------------------------------------------------
  b.path({ x: 53, y: 3 }, { x: 53, y: 41 }, 3); // the Brinewalk: gate -> quay square
  b.fillRect(52, 0, 3, 2, Tile.Path); // the mouth meets the carved Salt Road
  b.path({ x: 33, y: 18 }, { x: 51, y: 18 }, 2); // the Portreeve's lane
  b.path({ x: 55, y: 22 }, { x: 96, y: 22 }, 2); // east lane: the ropewalk's address
  b.path({ x: 55, y: 33 }, { x: 99, y: 33 }, 2); // shore lane: cottages and smokehouses
  b.path({ x: 12, y: 42 }, { x: 51, y: 42 }, 2); // the Salters' Lane: pans -> square

  // ---------------------------------------------------------------
  // THE QUAY SQUARE — the town's stone heart, open to the water: the
  // fish market at dawn, the lamplit walk at dusk. The quay apron
  // runs the whole working shore, and three timber piers walk out
  // over the deep.
  // ---------------------------------------------------------------
  b.fillEllipse(53, 44, 8, 4, Tile.StoneFloor);
  b.fillRect(40, 48, 41, 4, Tile.StoneFloor); // the quay apron, x40-80
  // The ellipse's rounded hips leave grass slivers against the apron
  // — pave them, or each orphan tile reads as a little green mat.
  b.set(47, 47, Tile.StoneFloor).set(62, 46, Tile.StoneFloor).set(62, 47, Tile.StoneFloor);
  b.stamp(MARKET_STALL, 44, 41);
  b.stamp(MARKET_STALL, 44, 45);
  b.stamp(MARKET_STALL, 59, 45);
  b.set(48, 41, Tile.BannerPole).set(58, 41, Tile.BannerPole);
  b.set(51, 47, Tile.Basin); // the gutting trough
  b.set(62, 42, Tile.Bench).set(49, 40, Tile.Bench);
  b.set(49, 48, Tile.LampPost).set(64, 48, Tile.LampPost).set(79, 48, Tile.LampPost);
  b.sign(58, 41, 'THE QUAY', ['fresh at dawn, smoked by dusk'], Tile.Signpost);
  // The piers: A off the square, B the long one, C by the east end.
  b.fillRect(46, 52, 2, 8, Tile.Dock);
  b.fillRect(58, 52, 2, 12, Tile.Dock);
  b.fillRect(70, 52, 2, 6, Tile.Dock);
  b.set(46, 60, Tile.FishingSpot).set(58, 64, Tile.FishingSpot).set(71, 58, Tile.FishingSpot);
  b.set(5, 55, Tile.FishingSpot); // the reed shallows, for the patient
  b.set(47, 52, Tile.Crate).set(59, 52, Tile.Barrel).set(70, 52, Tile.Crate);
  b.set(73, 50, Tile.ToolRack); // the net rack by pier C
  b.sign(57, 51, 'DEEP WATER', ['past the last post the mere', 'stops being your friend'], Tile.Signpost);
  // The Downwater Bell: the ferry stub, and the town's one dry joke.
  b.set(78, 50, Tile.Bench);
  b.sign(80, 49, 'THE DOWNWATER BELL', ['for the ferry, when there is one'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE GATEFRONT — the Salt Road arrives: watch house west of the
  // gate, the carters' bays east, and the town sign that says who
  // lives here before anyone says a word.
  // ---------------------------------------------------------------
  // The Watch House (Waykeepers): duty room and two bunks. The lamp
  // stays lit, even at the end of the road.
  b.fillRect(44, 4, 7, 7, Tile.StoneFloor);
  b.outlineRect(44, 4, 7, 7, Tile.WallStone);
  b.set(47, 10, Tile.DoorwayStone);
  b.set(45, 10, Tile.WallStoneWindow).set(49, 10, Tile.WallStoneWindow);
  b.set(45, 6, Tile.Table).set(46, 6, Tile.Chair); // the duty desk
  b.set(49, 5, Tile.WeaponRack);
  b.set(45, 7, Tile.Bed).set(45, 8, Tile.Bed);
  b.set(49, 7, Tile.Bed).set(49, 8, Tile.Bed);
  b.setDetail(47, 8, Detail.Doormat);
  b.set(44, 11, Tile.Brazier);
  b.sign(46, 10, 'THE WATCH HOUSE', ['the lamp stays lit, even here'], Tile.HangingSign);
  // The carters' bays: two rail stalls open to the south, a back
  // rail against the wall hem — the road's last stop, readable at a
  // glance (E-W rails face the camera; N-S runs read as bare posts).
  b.fillRect(58, 4, 11, 1, Tile.RailWood); // the back rail
  b.set(58, 5, Tile.RailWood).set(58, 6, Tile.RailWood);
  b.set(63, 5, Tile.RailWood).set(63, 6, Tile.RailWood);
  b.set(68, 5, Tile.RailWood).set(68, 6, Tile.RailWood);
  b.set(60, 5, Tile.Basin).set(66, 5, Tile.Basin);
  b.setDetail(60, 6, Detail.Straw).setDetail(61, 5, Detail.Straw).setDetail(65, 6, Detail.Straw).setDetail(66, 6, Detail.Straw);
  b.set(70, 5, Tile.Crate);
  b.set(50, 3, Tile.Brazier).set(56, 3, Tile.Brazier); // the gate fires
  b.sign(56, 4, 'SALTMERE', ['salt out, coin in', 'the last town before the water', 'mind the gulls'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE PORTREEVE'S HOUSE — stone, spare, the harbor ledger on the
  // lectern: Brack runs the port from the quay, not from a desk, but
  // the desk exists and the desk is neat. (Portreeve Brack.)
  // ---------------------------------------------------------------
  b.fillRect(24, 14, 9, 9, Tile.StoneFloor);
  b.outlineRect(24, 14, 9, 9, Tile.WallStone);
  b.set(32, 18, Tile.DoorwayStone); // fronts the lane
  b.set(28, 14, Tile.WallStoneWindow).set(32, 16, Tile.WallStoneWindow).set(28, 22, Tile.WallStoneWindow);
  b.set(26, 16, Tile.Lectern); // the harbor ledger
  b.set(25, 16, Tile.Bookshelf);
  b.set(25, 20, Tile.Table).set(26, 20, Tile.Chair);
  b.set(30, 16, Tile.Bed).set(30, 17, Tile.Bed);
  b.set(31, 21, Tile.Cabinet);
  b.setDetail(28, 18, Detail.Rug).setDetail(29, 18, Detail.Rug);
  b.setDetail(28, 19, Detail.Rug).setDetail(29, 19, Detail.Rug);
  b.setDetail(31, 18, Detail.Doormat);
  b.set(35, 16, Tile.LampPost);

  // ---------------------------------------------------------------
  // THE COUNTING HOUSE — the bank of the south: a teller line facing
  // the door, the public chests on the lobby floor, and the vault
  // room windowless at the back. Salt money sleeps dry. (Factor
  // Neave, who lodges at the Gull and trusts no bed nearer the damp.)
  // ---------------------------------------------------------------
  b.fillRect(58, 13, 11, 9, Tile.StoneFloor);
  b.outlineRect(58, 13, 11, 9, Tile.WallStone);
  b.set(58, 17, Tile.DoorwayStone); // fronts the Brinewalk stub
  b.set(61, 21, Tile.WallStoneWindow).set(61, 13, Tile.WallStoneWindow);
  for (let y = 14; y <= 20; y++) b.set(65, y, Tile.WallStone); // the vault wall
  b.set(65, 17, Tile.DoorwayStone);
  b.set(67, 14, Tile.Vault).set(67, 20, Tile.Vault);
  b.set(62, 15, Tile.Counter).set(62, 16, Tile.Counter).set(62, 18, Tile.Counter).set(62, 19, Tile.Counter);
  b.set(60, 15, Tile.BankChest).set(60, 19, Tile.BankChest);
  b.setDetail(60, 16, Detail.Rug).setDetail(60, 17, Detail.Rug).setDetail(60, 18, Detail.Rug);
  b.setDetail(63, 13, Detail.Tapestry).setDetail(64, 13, Detail.Tapestry);
  b.set(63, 20, Tile.Table).set(64, 20, Tile.Chair); // the factor's ledger desk
  b.path({ x: 55, y: 17 }, { x: 57, y: 17 }, 2);
  b.sign(63, 21, 'THE COUNTING HOUSE', ['coin kept dry'], Tile.HangingSign);

  // ---------------------------------------------------------------
  // THE ROPEWALK — the longest room in the Dawnlands: two looms at
  // the head, then four hundred feet of patience walked out strand
  // by strand, and Jessa's little room at the far end where the
  // finished coils sleep. (Roper Jessa.)
  // ---------------------------------------------------------------
  b.fillRect(72, 13, 27, 7, Tile.WoodFloor);
  b.outlineRect(72, 13, 27, 7, Tile.WallWood);
  b.set(75, 19, Tile.DoorwayWood); // fronts the east lane
  b.set(80, 19, Tile.WallWoodWindow).set(86, 19, Tile.WallWoodWindow).set(92, 19, Tile.WallWoodWindow);
  b.set(78, 13, Tile.WallWoodWindow).set(88, 13, Tile.WallWoodWindow);
  b.set(74, 15, Tile.Loom).set(74, 17, Tile.Loom);
  for (let x = 77; x <= 91; x += 2) b.setDetail(x, 16, Detail.Straw); // the walk itself
  for (let y = 14; y <= 18; y++) b.set(94, y, Tile.WallWood);
  b.set(94, 17, Tile.DoorwayWood);
  b.set(96, 15, Tile.Bed).set(96, 16, Tile.Bed);
  b.set(97, 18, Tile.Crate);
  b.set(95, 14, Tile.Barrel); // a coil, resting
  b.setDetail(75, 18, Detail.Doormat);
  b.set(71, 14, Tile.Crate).set(71, 15, Tile.Crate); // flax in from the retting
  b.sign(78, 19, 'THE ROPEWALK', ['four hundred feet of patience'], Tile.HangingSign);
  b.path({ x: 75, y: 20 }, { x: 75, y: 21 }, 1);

  // ---------------------------------------------------------------
  // FISHER ROW — three cottages shoulder to shoulder on the shore
  // lane, alike the way siblings are alike: same bones, different
  // lives. Voss keeps the first; the crews keep the other two.
  // ---------------------------------------------------------------
  // Voss's cottage: rods on the rack, not much else. He is out.
  b.fillRect(74, 24, 6, 7, Tile.WoodFloor);
  b.outlineRect(74, 24, 6, 7, Tile.WallWood);
  b.set(76, 30, Tile.DoorwayWood);
  b.set(78, 30, Tile.WallWoodWindow).set(74, 27, Tile.WallWoodWindow);
  b.set(75, 26, Tile.Bed).set(75, 27, Tile.Bed);
  b.set(78, 25, Tile.ToolRack); // the rods
  b.set(78, 28, Tile.Table).set(77, 28, Tile.Chair);
  b.setDetail(76, 28, Detail.RugRound);
  b.setDetail(76, 29, Detail.Doormat);
  // The middle cottage: a crew's bunk and a full net loft.
  b.fillRect(82, 24, 6, 7, Tile.WoodFloor);
  b.outlineRect(82, 24, 6, 7, Tile.WallWood);
  b.set(84, 30, Tile.DoorwayWood);
  b.set(86, 30, Tile.WallWoodWindow).set(87, 26, Tile.WallWoodWindow);
  b.set(83, 26, Tile.Bed).set(83, 27, Tile.Bed);
  b.set(86, 25, Tile.Crate).set(85, 25, Tile.Crate); // nets, folded wet
  b.set(86, 28, Tile.Table).set(85, 28, Tile.Chair);
  b.setDetail(84, 28, Detail.Doormat);
  // The east cottage: the tidy one. Somebody's mother trained them.
  b.fillRect(90, 24, 6, 7, Tile.WoodFloor);
  b.outlineRect(90, 24, 6, 7, Tile.WallWood);
  b.set(92, 30, Tile.DoorwayWood);
  b.set(94, 30, Tile.WallWoodWindow).set(90, 27, Tile.WallWoodWindow);
  b.set(91, 26, Tile.Bed).set(91, 27, Tile.Bed);
  b.set(94, 26, Tile.Cabinet);
  b.set(94, 28, Tile.Table).set(93, 28, Tile.Chair);
  b.setDetail(92, 27, Detail.Rug).setDetail(93, 27, Detail.Rug);
  b.setDetail(92, 29, Detail.Doormat);
  for (const dx of [76, 84, 92]) b.set(dx, 31, Tile.Dirt).set(dx, 32, Tile.Dirt);

  // ---------------------------------------------------------------
  // SALTMERE STORES — the chandlery: rope, tar, biscuit, and better.
  // Counter faces the door; the storeroom holds what the sea asks
  // for. Swale sleeps behind his stock, as a chandler should.
  // ---------------------------------------------------------------
  b.fillRect(58, 26, 9, 7, Tile.WoodFloor);
  b.outlineRect(58, 26, 9, 7, Tile.WallWood);
  b.set(58, 29, Tile.DoorwayWood); // fronts the Brinewalk stub
  b.set(58, 31, Tile.WallWoodWindow).set(61, 26, Tile.WallWoodWindow);
  b.set(60, 27, Tile.Counter).set(60, 28, Tile.Counter).set(60, 30, Tile.Counter).set(60, 31, Tile.Counter);
  b.set(59, 27, Tile.Cabinet);
  for (let y = 27; y <= 31; y++) b.set(62, y, Tile.WallWood);
  b.set(62, 29, Tile.DoorwayWood);
  b.set(65, 27, Tile.Bed).set(65, 28, Tile.Bed);
  b.set(63, 31, Tile.Crate).set(65, 31, Tile.Barrel).set(65, 30, Tile.Crate);
  b.setDetail(59, 29, Detail.Doormat);
  // The chandlery wears the water's own color: woad shed canvas on
  // the south wall, the fish on its bracket, a woad string for the
  // quay wind to worry at.
  b.set(63, 33, awningTile('shed', 2)).set(64, 33, awningTile('shed', 2));
  b.setDetail(60, 32, bracketSignDetail(3));
  b.setDetail(65, 32, pennantDetail(2));
  b.path({ x: 55, y: 29 }, { x: 57, y: 29 }, 2);
  b.sign(63, 32, 'SALTMERE STORES', ['rope, tar, biscuit, and better'], Tile.HangingSign);

  // ---------------------------------------------------------------
  // THE PAINTED GULL — the inn: a common room with the fire on the
  // west wall, the bar under Dorrit's eye, the kitchen walled off
  // behind it, and a guest wing where the beds are dry and the
  // blankets smell of smoke in the good way. The supper fire burns
  // outside on the lane, coaching-yard fashion.
  // ---------------------------------------------------------------
  b.fillRect(34, 26, 15, 13, Tile.WoodFloor);
  b.outlineRect(34, 26, 15, 13, Tile.WallWood);
  b.set(48, 31, Tile.DoorwayWoodWide).set(48, 32, Tile.DoorwayWoodWide); // fronts the Brinewalk
  b.set(48, 27, Tile.WallWoodWindow).set(48, 36, Tile.WallWoodWindow);
  b.set(38, 38, Tile.WallWoodWindow).set(44, 38, Tile.WallWoodWindow);
  b.set(38, 26, Tile.WallWoodWindow).set(44, 26, Tile.WallWoodWindow);
  // The guest wing, partitioned north.
  for (let x = 35; x <= 43; x++) if (x !== 39) b.set(x, 30, Tile.WallWood);
  b.set(39, 30, Tile.DoorwayWood);
  b.set(35, 27, Tile.Bed).set(35, 28, Tile.Bed);
  b.set(38, 27, Tile.Bed).set(38, 28, Tile.Bed);
  b.set(41, 27, Tile.Bed).set(41, 28, Tile.Bed); // the factor's room, by standing claim
  b.set(43, 27, Tile.Cabinet);
  b.setDetail(36, 29, Detail.Rug).setDetail(37, 29, Detail.Rug);
  // The bar, and Dorrit's cot tucked behind it.
  b.set(44, 29, Tile.Counter).set(44, 30, Tile.Counter).set(44, 31, Tile.Counter).set(44, 33, Tile.Counter).set(44, 34, Tile.Counter);
  b.set(46, 27, Tile.Bed).set(46, 28, Tile.Bed);
  b.set(47, 29, Tile.Cabinet);
  b.set(46, 36, Tile.Barrel).set(47, 36, Tile.Barrel).set(45, 36, Tile.Crate); // the cellar corner
  // The common room: hearth west, one long table, honest chairs.
  b.set(35, 31, Tile.Hearth);
  b.set(38, 33, Tile.Table).set(39, 33, Tile.Table).set(40, 33, Tile.Table);
  b.set(38, 32, Tile.Chair).set(40, 32, Tile.Chair).set(39, 34, Tile.Chair).set(41, 34, Tile.Chair);
  b.setDetail(41, 31, Detail.Rug).setDetail(42, 31, Detail.Rug);
  b.setDetail(41, 32, Detail.Rug).setDetail(42, 32, Detail.Rug);
  b.setDetail(40, 26, Detail.Tapestry).setDetail(41, 26, Detail.Tapestry);
  // The kitchen, walled off southwest.
  for (let y = 33; y <= 38; y++) b.set(37, y, Tile.WallWood);
  b.set(37, 35, Tile.DoorwayWood);
  b.set(35, 34, Tile.Basin).set(35, 36, Tile.Cabinet).set(36, 37, Tile.Table);
  b.setDetail(47, 31, Detail.Doormat).setDetail(47, 32, Detail.Doormat);
  b.set(49, 28, Tile.FlowerBox).set(49, 35, Tile.FlowerBox);
  b.sign(43, 38, 'THE PAINTED GULL', ['beds, broth, and the view south'], Tile.HangingSign);
  // The supper fire on the lane: the town's cookfire, always fed.
  b.set(41, 41, Tile.Campfire);
  b.set(39, 41, Tile.Bench).set(43, 41, Tile.Bench);
  b.setDetail(41, 42, Detail.Pebbles);

  // ---------------------------------------------------------------
  // SALTERS' HALL — the pans' trade house: the white harvest weighed
  // in the west hall, tallied in the east office. Ondra sleeps by
  // her scales; the salt never notices. (Master Salter Ondra.)
  // ---------------------------------------------------------------
  b.fillRect(10, 30, 15, 11, Tile.StoneFloor);
  b.outlineRect(10, 30, 15, 11, Tile.WallStone);
  b.set(17, 40, Tile.DoorwayStone); // fronts the Salters' Lane
  b.set(13, 40, Tile.WallStoneWindow).set(21, 40, Tile.WallStoneWindow);
  b.set(24, 34, Tile.WallStoneWindow).set(24, 37, Tile.WallStoneWindow);
  for (let y = 31; y <= 39; y++) b.set(19, y, Tile.WallStone);
  b.set(19, 35, Tile.DoorwayStone);
  // The west hall: stores, brine vats, the wash basin.
  b.set(12, 32, Tile.CrateGoods).set(13, 32, Tile.CrateGoods).set(12, 34, Tile.CrateGoods).set(13, 34, Tile.CrateGoods);
  b.set(16, 32, Tile.Barrel).set(16, 34, Tile.Barrel);
  b.set(12, 38, Tile.Basin);
  b.set(17, 38, Tile.ToolRack); // the rakes
  b.set(11, 31, Tile.Bed).set(11, 32, Tile.Bed);
  b.setDetail(14, 36, Detail.Straw).setDetail(15, 33, Detail.Straw);
  // The east office: the tally.
  b.set(21, 32, Tile.Lectern);
  b.set(23, 31, Tile.Bookshelf);
  b.set(22, 36, Tile.Table).set(21, 36, Tile.Chair);
  b.setDetail(21, 34, Detail.Rug).setDetail(22, 34, Detail.Rug);
  b.setDetail(17, 39, Detail.Doormat);
  b.path({ x: 17, y: 41 }, { x: 17, y: 41 }, 1);
  b.sign(15, 40, "SALTERS' HALL", ['the white harvest, weighed'], Tile.HangingSign);

  // ---------------------------------------------------------------
  // THE PANS — six shallow beds with dressed stone lips on the sand
  // flats: the mere walks in, the sun walks out, the salt stays.
  // Rake house on the lane; harvest heaped at the corners.
  // ---------------------------------------------------------------
  for (const [px, py] of [[9, 46], [16, 46], [23, 46], [9, 52], [16, 52], [23, 52]] as const) {
    b.outlineRect(px, py, 6, 4, Tile.StoneFloor);
    b.fillRect(px + 1, py + 1, 4, 2, Tile.WaterShallow);
  }
  b.set(14, 50, Tile.CrateGoods).set(22, 51, Tile.CrateGoods); // the harvest
  b.set(29, 50, Tile.Barrel);
  b.setDetail(12, 51, Detail.Pebbles).setDetail(20, 50, Detail.Pebbles).setDetail(26, 45, Detail.Pebbles);
  b.sign(30, 44, 'THE PANS', ['walk the lips, not the beds'], Tile.Signpost);
  // The rake house: tools, and a dry corner for the wet ones.
  b.fillRect(34, 45, 5, 5, Tile.WoodFloor);
  b.outlineRect(34, 45, 5, 5, Tile.WallWood);
  b.set(36, 45, Tile.DoorwayWood); // fronts the Salters' Lane
  b.set(34, 47, Tile.WallWoodWindow);
  b.set(35, 46, Tile.ToolRack).set(37, 46, Tile.Basin);
  b.set(35, 48, Tile.Crate);
  b.setDetail(36, 47, Detail.Straw);
  b.path({ x: 36, y: 43 }, { x: 36, y: 44 }, 1);

  // ---------------------------------------------------------------
  // THE MERE LIGHT — the road-faith's southernmost lamp, on its own
  // stone islet off the pans: lit from the mother flame, tended by
  // one keeper, and it has not gone out since. The causeway floods
  // in bad years; the light doesn't care. (Lightkeeper Lund.)
  // ---------------------------------------------------------------
  b.fillRect(16, 60, 2, 4, Tile.Dock); // the causeway
  b.fillEllipse(17, 67, 5, 4, Tile.StoneFloor);
  b.outlineRect(15, 65, 5, 5, Tile.WallStone);
  b.set(17, 65, Tile.DoorwayStone);
  b.set(15, 67, Tile.WallStoneWindow).set(19, 67, Tile.WallStoneWindow);
  b.set(16, 66, Tile.Bed).set(16, 67, Tile.Bed);
  b.set(18, 66, Tile.Table).set(18, 67, Tile.Chair);
  b.setDetail(17, 67, Detail.RugRound);
  b.set(13, 67, Tile.Brazier).set(21, 67, Tile.Brazier);
  b.set(19, 69, Tile.LampPost);
  b.sign(18, 65, 'THE MERE LIGHT', ['lit from the mother flame', 'it has not gone out since'], Tile.HangingSign);
  b.sign(14, 59, "THE MERE'S TOLL", ['Berta. Coll. Ashon. Grev.', 'the water kept them', 'the light remembers'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE SMOKEHOUSES — two stone kilns and the rack yard between the
  // shore lane and the sand: the world's first school of the slow
  // fire. Alba teaches anyone who can gut a fish without being told
  // twice. Her cottage keeps the row's east end.
  // ---------------------------------------------------------------
  b.fillRect(78, 36, 6, 6, Tile.StoneFloor);
  b.outlineRect(78, 36, 6, 6, Tile.WallStone);
  b.set(80, 41, Tile.DoorwayStone);
  b.set(82, 41, Tile.WallStoneWindow);
  b.set(80, 38, Tile.Campfire); // the slow fire
  b.set(79, 37, Tile.ToolRack).set(82, 37, Tile.ToolRack);
  b.set(82, 39, Tile.Crate);
  b.fillRect(86, 36, 6, 6, Tile.StoneFloor);
  b.outlineRect(86, 36, 6, 6, Tile.WallStone);
  b.set(88, 41, Tile.DoorwayStone);
  b.set(90, 41, Tile.WallStoneWindow);
  b.set(88, 38, Tile.Campfire);
  b.set(87, 37, Tile.ToolRack).set(90, 37, Tile.ToolRack);
  b.set(90, 39, Tile.Barrel);
  // The rack yard: split fish drying in the wind off the mere.
  b.set(80, 43, Tile.ToolRack).set(84, 43, Tile.ToolRack).set(88, 43, Tile.ToolRack);
  b.set(79, 45, Tile.Barrel).set(90, 45, Tile.Crate);
  b.setDetail(82, 44, Detail.Straw).setDetail(86, 44, Detail.Straw);
  b.sign(76, 41, 'THE SMOKEHOUSES', ['slow smoke, honest fish'], Tile.Signpost);
  // Alba's cottage, east of the row.
  b.fillRect(94, 36, 6, 7, Tile.WoodFloor);
  b.outlineRect(94, 36, 6, 7, Tile.WallWood);
  b.set(96, 36, Tile.DoorwayWood); // fronts the shore lane
  b.set(94, 39, Tile.WallWoodWindow).set(99, 39, Tile.WallWoodWindow);
  b.set(95, 38, Tile.Bed).set(95, 39, Tile.Bed);
  b.set(98, 38, Tile.Table).set(98, 39, Tile.Chair);
  b.set(98, 41, Tile.Cabinet);
  b.setDetail(96, 39, Detail.Rug).setDetail(97, 39, Detail.Rug);
  b.setDetail(96, 37, Detail.Doormat);
  b.path({ x: 96, y: 35 }, { x: 96, y: 35 }, 1);

  // ---------------------------------------------------------------
  // THE BOATWRIGHT'S STRAND — Seff's shed and slipway behind the
  // east mole: timber up the beach, sawdust in everything, and the
  // painted eyes going on last, always last. (Boatwright Seff.)
  // ---------------------------------------------------------------
  b.fillRect(95, 44, 7, 7, Tile.WoodFloor);
  b.outlineRect(95, 44, 7, 7, Tile.WallWood);
  b.set(95, 47, Tile.DoorwayWood);
  b.set(95, 49, Tile.WallWoodWindow).set(98, 44, Tile.WallWoodWindow);
  b.set(97, 45, Tile.Workbench);
  b.set(100, 45, Tile.ToolRack);
  b.set(100, 48, Tile.Bed).set(100, 49, Tile.Bed);
  b.set(97, 49, Tile.Crate);
  b.setDetail(98, 47, Detail.Sawdust).setDetail(96, 48, Detail.Sawdust);
  b.set(94, 53, Tile.Sawhorse);
  b.set(97, 52, Tile.CarvingBench);
  b.fillRect(99, 52, 2, 7, Tile.Dock); // the slipway, down into the water
  b.set(96, 55, Tile.Stump).set(94, 55, Tile.Stump); // timber, waiting
  b.setDetail(95, 53, Detail.Sawdust).setDetail(95, 55, Detail.Sawdust);
  b.sign(92, 50, 'THE SLIPWAY', ['every hull gets its eyes here'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE PILOT'S COT — Fane's weathered box at the quay's east end,
  // one chair pointed at the water. Fane knew the mere before it had
  // a bell to ignore. (Old Pilot Fane.)
  // ---------------------------------------------------------------
  b.fillRect(72, 42, 6, 5, Tile.WoodFloor);
  b.outlineRect(72, 42, 6, 5, Tile.WallWood);
  b.set(74, 46, Tile.DoorwayWood); // opens onto the quay apron
  b.set(76, 46, Tile.WallWoodWindow).set(72, 44, Tile.WallWoodWindow);
  b.set(73, 43, Tile.Bed).set(73, 44, Tile.Bed);
  b.set(76, 43, Tile.Cabinet);
  b.set(75, 44, Tile.Chair);
  b.setDetail(74, 45, Detail.Doormat);

  // ---------------------------------------------------------------
  // THE TOWN WALL — a garrison curtain on the three land sides, both
  // ends wading into the mere (the harbor-mole law: the water is the
  // fourth wall). One gate, where the Salt Road was always going to
  // knock. Corner cuts at 45; gates stand open; only a hand shuts
  // them.
  // ---------------------------------------------------------------
  b.fillRect(6, 2, 46, 1, Tile.WallGarrison); // north curtain, west of the gate
  b.set(52, 2, Tile.GateGarrison).set(53, 2, Tile.GateGarrison).set(54, 2, Tile.GateGarrison);
  b.fillRect(55, 2, 47, 1, Tile.WallGarrison); // north curtain, east of the gate
  b.set(5, 3, Tile.WallGarrisonDiagSE);
  b.set(102, 3, Tile.WallGarrisonDiagSW);
  b.fillRect(4, 4, 1, 52, Tile.WallGarrison); // west curtain, y4-55: into the water
  b.fillRect(103, 4, 1, 48, Tile.WallGarrison); // east curtain, y4-51: the mole
  b.set(103, 52, Tile.Water).set(103, 53, Tile.Water); // the mole's wet shadow

  // ---------------------------------------------------------------
  // SOFT EDGES — heath grass, gull-picked rocks, wind-bent trees on
  // the dry corners, and the north hem the road walks in through.
  // ---------------------------------------------------------------
  b.set(28, 6, Tile.Tree).set(12, 10, Tile.Tree).set(98, 7, Tile.Tree).set(89, 9, Tile.Tree);
  b.set(99, 10, Tile.Rock).set(100, 11, Tile.Rock);
  b.set(9, 26, Tile.Rock);
  b.set(70, 10, Tile.BerryBush).set(20, 26, Tile.BerryBush);
  b.setDetail(8, 43, Detail.Pebbles).setDetail(33, 43, Detail.Pebbles).setDetail(78, 46, Detail.Pebbles).setDetail(94, 47, Detail.Pebbles);
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.03);
  b.scatterDetail(Detail.Tuft, 0.06);
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(x - 53) <= 4 && y <= 6) continue; // the gate breathes
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.28 : edge < 6 ? 0.08 : 0;
      if (density > 0 && brineRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // ---------------------------------------------------------------
  // THE PEOPLE — eighteen lives on the mere's clock. Placements are
  // the POST each routine measures from.
  // ---------------------------------------------------------------
  b.actor('portreeve_brack', 55.5, 50.5, Math.PI / 2, 'salt_portreeve');
  b.actor('factor_neave', 63.5, 17.3, Math.PI, 'salt_factor');
  b.actor('innkeep_dorrit', 45.5, 31.5, Math.PI, 'salt_innkeep');
  b.actor('chandler_swale', 61.3, 29.5, Math.PI, 'salt_chandler');
  b.actor('salter_ondra', 15.5, 50.5, Math.PI / 2, 'salt_salter');
  b.actor('smokemistress_alba', 80.5, 39.4, -Math.PI / 2, 'salt_smoke');
  b.actor('angler_voss', 58.5, 62.5, Math.PI / 2, 'salt_angler');
  b.actor('boatwright_seff', 94.5, 52.4, Math.PI / 2, 'salt_boatwright');
  b.actor('roper_jessa', 75.5, 15.5, Math.PI, 'salt_roper');
  b.actor('lightkeeper_lund', 17.5, 70.4, Math.PI / 2, 'salt_beacon');
  b.actor('pilot_fane', 78.5, 49.5, Math.PI / 2, 'salt_pilot');
  b.actor('saltmere_watch', 53.5, 4.5, Math.PI / 2, 'salt_watch_gate');
  b.actor('saltmere_watch', 49.5, 46.5, Math.PI / 2, 'salt_watch_square');
  b.actor('saltmere_watch', 68.5, 49.5, Math.PI / 2, 'salt_watch_quay');
  b.actor('saltmere_fisher', 47.5, 55.5, Math.PI / 2, 'salt_fisher_piers');
  b.actor('saltmere_fisher', 84.5, 34.5, Math.PI / 2, 'salt_fisher_yard');
  b.actor('saltmere_fisher', 71.5, 51.5, Math.PI / 2, 'salt_fisher_east');
  b.npcSpawn('chicken', 81, 34.5, 1.5, 3);

  b.spawn(54.5, 44.5); // the quay square: the respawn hearth of the south
  return b.build();
}

/** Stable per-tile hash so the town is byte-identical every boot. */
function brineRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5a17;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 0xffffffff;
}
