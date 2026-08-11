import {
  Detail,
  Tile,
  awningTile,
  bracketSignDetail,
  pennantDetail,
  trellisDetail,
  wallBannerDetail,
} from '@arx/shared';
import { PINEWATCH_RECT } from '../geography.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Pinewatch — the town that watches the deep wood, on the south-east
 * shore of the Glasswater. Level 20-30 country: tier 4 at the walls,
 * tier 5 the moment you cross the water or step past the Wardline.
 *
 * THE NAME IS OLDER THAN THE TRADE. Pinewatch was a watchtower before
 * it was a town, and what it watched for came once: the WOLFWINTER,
 * forty years ago, when the Glasswater froze end to end and the packs
 * walked across it and took the outlying camps one by one. The tower
 * held. The town grew up around the people who did not leave, and the
 * watch is still kept nightly, by rota, by everyone. The sawyer takes
 * her turn on the stair the same as the reeve.
 *
 * THE TRADE. Silverfall is stone, and its Timberway eats pine it
 * cannot grow; Amberford builds with it; Saltmere lays keels of it.
 * Every great stick of timber in the Dawnlands comes off this one
 * shore. The Crown's buyer and the Charter's factor share the
 * Charterhouse and hate each other politely.
 *
 * THE WARDLINE. A ring of blazed pines and boundary stones around the
 * licensed cut: inside it you may fell, outside you may not, because
 * the old wood is what the wolves live in and a cut road into it is a
 * road OUT of it. The great spars only grow past the line.
 *
 * THE TOWN-PLAN LAW (Amberford's, kept whole):
 *  - STREETS FIRST. The Watch Road runs gate to muster yard; the
 *    Shore Lane runs the whole working waterfront; Sparwrights' Lane
 *    and the Wardline Path hang off them. Every building fronts one
 *    of the four, with >= 3 open tiles between structures.
 *  - A DIAGONAL BUDGET OF TWO, both on the Old Watch's knoll: the
 *    tower's south shoulders. Everything else is honest square,
 *    because everything else was built by people with a saw and a
 *    quota.
 *  - ROOM INTENT. One job per room, furniture proves it.
 *
 * THE SHORE PLAN — the Glasswater is the fourth wall (Saltmere's law,
 * and here it is the town's whole idea). The curtain rings only the
 * three land sides and dies into the water at both ends. West to east
 * along the shore: the reed bay, the millrace mouth and the Great
 * Saw's tail, the timber strand, THE BOOM (the log pond cut into the
 * land, chained across its mouth), the raft dock, the fisher steps.
 * North across the water is the old wood, and nothing crosses the
 * water. Except in a hard winter.
 *
 * Anchors that must NOT move (routines hang off them): the Old Watch
 * tower and its bell, the muster yard and the rota board, the boom
 * and both piers, the millrace, every door, every bed, every station,
 * and the three gates. The Timber Road lands at world (584,-89) =
 * local (64,95); the Sparway lands at world (520,-136) = local
 * (0,48). The mouth rows meet the carved routes tile-exact.
 */
export function buildPinewatch(): ZoneDef {
  const R = PINEWATCH_RECT;
  const b = new ZoneBuilder('pinewatch', 'Pinewatch', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE GLASSWATER — water first: the lake decides everything else.
  // The shore runs north-east, so the town sits in the crook of it.
  // A one-tile wobble keeps any ruler off the waterline.
  // ---------------------------------------------------------------
  const shoreAt = (x: number): number => {
    if (x <= 20) return 40 + Math.round(Math.sin(x * 0.8));
    if (x <= 36) return 36 + Math.round(Math.sin(x * 0.6));
    if (x <= 52) return 26 + Math.round(Math.sin(x * 0.9));
    if (x <= 70) return 16 + Math.round(Math.sin(x * 0.7));
    if (x <= 86) return 10 + Math.round(Math.sin(x * 0.8));
    if (x <= 102) return 5 + Math.round(Math.sin(x * 0.6));
    return -1; // the north-east corner is land to the border
  };
  for (let x = 0; x < R.w; x++) {
    const s = shoreAt(x);
    if (s < 0) continue;
    for (let y = 0; y < s; y++) {
      b.set(x, y, y < s - 7 ? Tile.WaterDeep : Tile.Water);
    }
    b.set(x, s - 1, Tile.WaterShallow); // the wading margin
    if (s >= 2) b.set(x, s - 2, Tile.WaterShallow);
  }
  // Sand: the worked strand between grass and water, wider where the
  // town actually works the shore.
  for (let x = 8; x <= 102; x++) {
    const s = shoreAt(x);
    if (s < 0) continue;
    const depth = x >= 40 && x <= 78 ? 4 : 2;
    for (let y = s; y < s + depth; y++) b.set(x, y, Tile.Sand);
  }
  // The reed bay in the west, where nobody works.
  b.set(3, 41, Tile.Swamp).set(5, 43, Tile.Swamp).set(2, 44, Tile.Swamp);
  b.set(6, 40, Tile.FibrePlant).set(4, 45, Tile.FibrePlant);
  b.set(9, 38, Tile.FishingSpot).set(96, 3, Tile.FishingSpot);

  // ---------------------------------------------------------------
  // THE MILLRACE — the lake's one outfall, cut straight by somebody's
  // great-grandfather and cursed by everyone since. It leaves the bay
  // at x22, runs south past the Great Saw's wheel, and goes out under
  // the west curtain. The saw is the loudest building in the
  // Dawnlands and this is why it stands where it stands.
  // ---------------------------------------------------------------
  for (let y = 36; y <= 55; y++) b.fillRect(21, y, 2, 1, Tile.WaterShallow);
  for (let x = 14; x <= 21; x++) b.fillRect(x, 55, 1, 2, Tile.WaterShallow);
  // The tailrace pond: the race does NOT go under the curtain (a hole
  // in a wall is a hole in a wall). It spends itself in a sump the
  // town dug inside its own line, and soaks away into the reed corner.
  b.fillEllipse(12, 56, 5, 3, Tile.WaterShallow);
  b.set(9, 55, Tile.Swamp).set(8, 57, Tile.Swamp).set(10, 59, Tile.Swamp);
  // Plank crossings: the race is knee-deep and everyone still uses
  // the boards, because the water is snowmelt in every month.
  b.fillRect(21, 47, 2, 2, Tile.Bridge);
  b.fillRect(18, 55, 2, 2, Tile.Bridge);

  // ---------------------------------------------------------------
  // THE BOOM — the log pond, cut into the land and chained across its
  // mouth so a season's felling floats safe from the lake's weather.
  // Logs come down the water, get sorted at the gap, and go up the
  // slip to the saw. Nothing about this town happens before this
  // happens.
  // ---------------------------------------------------------------
  b.fillRect(46, 14, 20, 12, Tile.Water);
  b.fillRect(47, 24, 18, 2, Tile.WaterShallow);
  for (let x = 46; x <= 65; x++) b.set(x, 13, Tile.Dock); // the boom itself
  b.set(45, 14, Tile.Dock).set(45, 15, Tile.Dock);
  b.set(66, 14, Tile.Dock).set(66, 15, Tile.Dock);
  b.fillRect(50, 20, 2, 6, Tile.Dock); // the west pier
  b.fillRect(60, 18, 2, 8, Tile.Dock); // the raft dock, the long one
  b.set(50, 19, Tile.FishingSpot).set(61, 17, Tile.FishingSpot);
  for (let x = 45; x <= 67; x++) {
    if (b.get(x, 26) === Tile.Grass || b.get(x, 26) === Tile.GrassTall) b.set(x, 26, Tile.Sand);
    if (b.get(x, 27) === Tile.Grass || b.get(x, 27) === Tile.GrassTall) b.set(x, 27, Tile.Sand);
  }
  for (let y = 14; y <= 27; y++) {
    for (const x of [44, 45, 67, 68]) {
      if (b.get(x, y) === Tile.Grass || b.get(x, y) === Tile.GrassTall) b.set(x, y, Tile.Sand);
    }
  }
  b.set(53, 25, Tile.ToolRack).set(57, 25, Tile.ToolRack); // the pike-poles
  b.set(48, 26, Tile.Crate).set(63, 26, Tile.Barrel);
  b.setDetail(52, 26, Detail.Sawdust).setDetail(58, 27, Detail.Sawdust);
  b.sign(67, 20, 'THE BOOM', ['walk the chain and you swim', 'the water is snowmelt in July'], Tile.Signpost);
  // The sorting gap and its tally shed, on the strand between pond
  // and lane: two counters, a ledger, and a roof that leaks.
  b.fillRect(68, 22, 8, 7, Tile.WoodFloor);
  b.outlineRect(68, 22, 8, 7, Tile.WallWood);
  b.set(71, 28, Tile.DoorwayWood);
  b.set(68, 25, Tile.WallWoodWindow).set(75, 25, Tile.WallWoodWindow);
  b.set(70, 23, Tile.Counter).set(71, 23, Tile.Counter);
  b.set(73, 23, Tile.Lectern); // the tally
  b.set(69, 26, Tile.Table).set(70, 26, Tile.Chair);
  b.set(74, 26, Tile.Crate).set(74, 27, Tile.Barrel);
  b.setDetail(71, 27, Detail.Doormat);
  // The shed keeps its counters dry under a board rain-roof (cloth
  // would hold the snow; timber sheds it), hopvine up the east end,
  // and the shingle standing on the strand, one pace off the wall.
  b.sign(73, 29, 'THE TALLY SHED', ['every stick counted twice', 'once wet, once dry'], Tile.HangingSign);
  b.set(69, 29, awningTile('board', 6)).set(70, 29, awningTile('board', 6));
  b.setDetail(74, 28, trellisDetail(2));
  // Timber strand: the season's cut, stacked and waiting for the saw.
  for (const [sx, sy] of [[38, 22], [42, 24], [36, 26], [40, 28], [44, 30]] as const) {
    b.set(sx, sy, Tile.Stump).set(sx + 1, sy, Tile.Stump);
  }
  b.setDetail(39, 23, Detail.Sawdust).setDetail(41, 29, Detail.Sawdust);

  // ---------------------------------------------------------------
  // THE OLD WATCH — the tower that named the place, on the moot knoll
  // it has always stood on. One stair up, one bell, one rota board at
  // the foot, and forty years of names on the memorial beside it.
  // The knoll is the only raised ground in town and the only place
  // you can see the whole far shore from.
  // ---------------------------------------------------------------
  b.raise(56, 30, 22, 16, 1);
  for (let x = 65; x <= 67; x++) b.stairs(x, 45);
  b.fillRect(57, 31, 20, 14, Tile.Grass);
  // The tower: stone, square, and older than every other wall here.
  b.fillRect(62, 34, 9, 9, Tile.StoneFloor);
  b.outlineRect(62, 34, 9, 9, Tile.WallStone);
  b.set(66, 42, Tile.DoorwayStone);
  b.set(62, 38, Tile.WallStoneWindow).set(70, 38, Tile.WallStoneWindow);
  b.set(64, 34, Tile.WallStoneWindow).set(68, 34, Tile.WallStoneWindow);
  // The two diagonals this town is allowed: the tower's south
  // shoulders, cut so the stair mouth reads from the yard below.
  b.set(62, 42, Tile.WallStoneDiagNE);
  b.set(70, 42, Tile.WallStoneDiagNW);
  b.set(64, 36, Tile.Hearth);
  b.set(68, 36, Tile.Bed).set(68, 37, Tile.Bed); // the night watch sleeps here
  b.set(64, 40, Tile.Table).set(65, 40, Tile.Chair);
  b.set(68, 40, Tile.WeaponRack);
  b.set(66, 35, Tile.Lectern); // the watch book
  b.set(63, 37, Tile.Cabinet).set(63, 40, Tile.Chair);
  b.set(69, 39, Tile.Barrel);
  b.setDetail(66, 38, Detail.Rug).setDetail(66, 39, Detail.Rug);
  b.setDetail(66, 41, Detail.Doormat);
  b.set(59, 33, Tile.Brazier).set(74, 33, Tile.Brazier);
  b.set(59, 43, Tile.Brazier).set(74, 43, Tile.Brazier);
  b.set(60, 38, Tile.BannerPole).set(73, 38, Tile.BannerPole);
  b.set(59, 36, Tile.Stump).set(60, 36, Tile.Stump).set(59, 37, Tile.Stump);
  b.set(74, 36, Tile.Bench).set(74, 40, Tile.Barrel);
  b.set(58, 40, Tile.LampPost).set(75, 39, Tile.LampPost);
  b.set(72, 44, Tile.Crate);
  b.setDetail(66, 44, Detail.Pebbles).setDetail(63, 44, Detail.Tuft);
  b.set(63, 33, Tile.TreePine).set(71, 32, Tile.TreePine);
  // The tower's board stands on the knoll grass before the door; the
  // south stone hangs the watch's charcoal on both shoulders — iron
  // colors on the oldest wall in town, nothing brighter.
  b.sign(64, 43, 'THE OLD WATCH', ['climb it or take your turn below', 'the bell is not decoration'], Tile.HangingSign);
  b.setDetail(63, 42, wallBannerDetail(7)).setDetail(69, 42, wallBannerDetail(7));

  // ---------------------------------------------------------------
  // THE MUSTER YARD — the knoll's south foot, and the town's whole
  // civic life: the rota board, the bell rope, the benches the old
  // ones own by right, and the fire that is never allowed out.
  // ---------------------------------------------------------------
  b.fillRect(54, 46, 26, 10, Tile.StoneFloor);
  b.fillRect(64, 46, 4, 2, Tile.StoneFloor);
  b.set(61, 50, Tile.Lectern); // THE ROTA: whose night it is
  b.sign(60, 50, 'THE ROTA', ['every roof takes a night', 'no roof is excused'], Tile.Signpost);
  b.set(66, 52, Tile.Campfire); // the yard fire, fed since the Wolfwinter
  b.set(63, 52, Tile.Bench).set(69, 52, Tile.Bench).set(66, 54, Tile.Bench);
  b.set(56, 48, Tile.LampPost).set(78, 48, Tile.LampPost);
  b.set(56, 54, Tile.LampPost).set(78, 54, Tile.LampPost);
  b.set(72, 50, Tile.Basin); // the yard trough
  // The muster yard boards companions too (beastcraft v2): the pen
  // stands past the trough where the rota can see it — every roof
  // takes a night, and somebody's beast is always waiting on one.
  b.set(74, 50, Tile.BeastPen);
  b.setDetail(75, 51, Detail.Straw); // mucked toward the trough, not the fire
  b.setDetail(66, 53, Detail.Pebbles);
  // THE WOLFWINTER STONE: the memorial. Fourteen names, and the town
  // still argues about the fifteenth.
  b.sign(75, 53, 'THE WOLFWINTER', [
    'Bern. Hedda. Alvi. Sten. Roska.',
    'and nine more the ice took',
    'the tower held. we did not all',
  ], Tile.Signpost);
  b.set(76, 54, Tile.Brazier);

  // ---------------------------------------------------------------
  // THE STREETS — laid before anything was allowed to stand on them.
  // ---------------------------------------------------------------
  b.path({ x: 65, y: 56 }, { x: 65, y: 94 }, 3); // the Watch Road: yard -> south gate
  b.path({ x: 44, y: 48 }, { x: 104, y: 48 }, 2); // the Shore Lane: yard hem -> Charterhouse
  b.path({ x: 8, y: 62 }, { x: 64, y: 62 }, 2); // the Mill Lane: the west spine
  b.path({ x: 20, y: 75 }, { x: 100, y: 75 }, 2); // Sparwrights' Lane
  b.path({ x: 66, y: 60 }, { x: 105, y: 60 }, 2); // the Wardline Path
  b.path({ x: 32, y: 56 }, { x: 32, y: 61 }, 2); // the Saw Track, down to the Mill Lane
  b.path({ x: 93, y: 61 }, { x: 93, y: 74 }, 2); // the Kiln Track
  b.fillRect(63, 89, 3, 7, Tile.Path); // the south mouth meets the Timber Road
  b.fillRect(0, 47, 7, 3, Tile.Path); // the west mouth meets the Sparway
  b.fillRect(107, 59, 21, 2, Tile.Dirt); // the Wardline Path, unpaved past the gate

  // ---------------------------------------------------------------
  // THE GREAT SAW — the reason the millrace was ever cut. Wheel on
  // the water, saw pit down the middle, log deck north where the slip
  // comes up from the pond, board stacks south where the wains load.
  // You can hear it from the Wardline on a still day.
  // ---------------------------------------------------------------
  b.fillRect(25, 42, 18, 14, Tile.WoodFloor);
  b.outlineRect(25, 42, 18, 14, Tile.WallWood);
  b.set(31, 55, Tile.DoorwayWoodWide).set(32, 55, Tile.DoorwayWoodWide);
  b.set(25, 46, Tile.WallWoodWindow).set(25, 51, Tile.WallWoodWindow);
  b.set(42, 46, Tile.WallWoodWindow).set(42, 51, Tile.WallWoodWindow);
  b.set(33, 42, Tile.DoorwayWood); // the log door, onto the deck
  // The saw floor: the pit down the middle, benches either hand.
  b.set(28, 45, Tile.Sawhorse).set(28, 47, Tile.Sawhorse).set(28, 49, Tile.Sawhorse);
  b.set(31, 45, Tile.Workbench).set(31, 47, Tile.Workbench);
  b.set(36, 45, Tile.CarvingBench).set(36, 47, Tile.CarvingBench);
  b.set(39, 45, Tile.ToolRack).set(39, 49, Tile.ToolRack);
  b.set(27, 53, Tile.Crate).set(28, 53, Tile.Crate).set(40, 53, Tile.Barrel);
  b.set(26, 50, Tile.CrateGoods).set(27, 50, Tile.CrateGoods);
  b.set(26, 51, Tile.CrateGoods).set(27, 51, Tile.CrateGoods);
  b.set(31, 50, Tile.Hearth); // the sawyers' stove, and the only warm corner
  b.set(33, 51, Tile.Table).set(33, 52, Tile.Chair).set(34, 51, Tile.Chair);
  b.set(37, 49, Tile.Barrel).set(41, 44, Tile.Crate);
  b.setDetail(29, 49, Detail.Sawdust).setDetail(34, 53, Detail.Sawdust);
  b.setDetail(38, 48, Detail.Sawdust).setDetail(27, 46, Detail.Sawdust);
  b.setDetail(33, 47, Detail.Sawdust).setDetail(35, 50, Detail.Sawdust);
  b.setDetail(30, 51, Detail.Sawdust).setDetail(37, 52, Detail.Sawdust);
  // The sawyer's corner: a cot, a stove, and a chair facing the door.
  b.set(38, 52, Tile.Bed).set(39, 52, Tile.Bed);
  b.set(37, 54, Tile.Chair);
  // The loudest building dresses like a working shed: board rain-
  // roofs both sides of the wain door, sawdust drifting out from
  // under them, and the shingle planted where the track meets the
  // stacks — in front of the wall, never cut into it.
  b.sign(35, 56, 'THE GREAT SAW', ['boards, beams, and battens', 'shout twice, she is deaf on the left'], Tile.HangingSign);
  b.set(27, 56, awningTile('board', 6)).set(28, 56, awningTile('board', 6));
  b.set(38, 56, awningTile('board', 6)).set(39, 56, awningTile('board', 6));
  b.setDetail(30, 56, Detail.Sawdust).setDetail(37, 56, Detail.Sawdust);
  // The log deck and the slip up from the pond.
  b.fillRect(30, 36, 14, 5, Tile.Dirt);
  b.fillRect(36, 30, 2, 7, Tile.Dock); // the slip
  b.set(31, 38, Tile.Stump).set(33, 38, Tile.Stump).set(42, 37, Tile.Stump);
  b.setDetail(35, 39, Detail.Sawdust).setDetail(39, 38, Detail.Sawdust);
  // The board stacks, south, where the wains come.
  for (const [cx, cy] of [[26, 57], [30, 57], [26, 59], [30, 59], [34, 58]] as const) {
    b.set(cx, cy, Tile.CrateGoods).set(cx + 1, cy, Tile.CrateGoods);
  }
  b.sign(38, 58, 'BOARD YARD', ['loads out at first light', 'do not climb the stacks'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE AXE-SMITH — every tooth in this town comes off this stone.
  // Axes, wedges, peaveys, saw-teeth, and the boom chain, which is
  // one job and takes a fortnight. The forge stands between the log
  // deck and the knoll so the smith can hear the saw and be heard by
  // the yard, which is exactly how she wanted it.
  // ---------------------------------------------------------------
  b.fillRect(45, 34, 9, 9, Tile.StoneFloor);
  b.outlineRect(45, 34, 9, 9, Tile.WallStone);
  b.set(49, 42, Tile.DoorwayStone);
  b.set(45, 37, Tile.WallStoneWindow).set(53, 37, Tile.WallStoneWindow);
  b.set(47, 34, Tile.WallStoneWindow);
  b.set(46, 35, Tile.Furnace).set(48, 35, Tile.Furnace);
  b.set(51, 35, Tile.Anvil).set(51, 37, Tile.Anvil);
  b.set(46, 38, Tile.Workbench).set(46, 40, Tile.ToolRack);
  b.set(52, 40, Tile.Basin); // the quench
  b.set(49, 39, Tile.Counter); // the commission counter, facing the door
  b.set(48, 41, Tile.Crate).set(52, 34, Tile.Barrel);
  b.setDetail(49, 41, Detail.Doormat);
  // Her trade on the wall: the blade on its bracket west of the door,
  // a charcoal board-roof over the quench corner (forge colors), and
  // the shingle standing in the yard.
  b.sign(51, 43, 'THE AXE-SMITH', ['teeth set, heads hung, chain mended', 'the chain takes a fortnight'], Tile.HangingSign);
  b.setDetail(47, 42, bracketSignDetail(2));
  b.set(52, 43, awningTile('board', 7)).set(53, 43, awningTile('board', 7));
  b.fillRect(49, 43, 1, 4, Tile.Dirt);
  b.set(44, 36, Tile.Stump).set(55, 40, Tile.Stump);
  b.set(56, 47, Tile.Brazier);

  // ---------------------------------------------------------------
  // THE CHARTERHOUSE — stone, and the only stone building in town
  // besides the tower. The Crown's buyer keeps the north room, the
  // Charter's factor the south, and the strongroom between them is
  // the one thing they have ever agreed about. Coin sleeps dry.
  // ---------------------------------------------------------------
  b.fillRect(84, 34, 17, 12, Tile.StoneFloor);
  b.outlineRect(84, 34, 17, 12, Tile.WallStone);
  b.set(90, 45, Tile.DoorwayStoneWide).set(91, 45, Tile.DoorwayStoneWide);
  b.set(84, 38, Tile.WallStoneWindow).set(100, 38, Tile.WallStoneWindow);
  b.set(87, 34, Tile.WallStoneWindow).set(97, 34, Tile.WallStoneWindow);
  // The strongroom, windowless, walled off in the middle.
  for (let y = 35; y <= 41; y++) b.set(92, y, Tile.WallStone);
  b.set(92, 39, Tile.DoorwayStone);
  b.set(95, 36, Tile.Vault).set(97, 36, Tile.Vault);
  b.set(94, 40, Tile.BankChest).set(97, 40, Tile.BankChest);
  b.setDetail(95, 38, Detail.Rug).setDetail(96, 38, Detail.Rug);
  // The Crown's room, north-west: a desk, a seal, and a chair that
  // has been sat in by three buyers who all hated the posting.
  b.set(86, 36, Tile.Lectern);
  b.set(85, 35, Tile.Bookshelf);
  b.set(88, 37, Tile.Table).set(88, 38, Tile.Chair);
  b.setDetail(86, 34, Detail.Tapestry).setDetail(87, 34, Detail.Tapestry);
  // The Charter's room, south-west: a counter, a cash drawer, and a
  // ledger wall going back to before the Wolfwinter.
  b.set(86, 42, Tile.Counter).set(87, 42, Tile.Counter);
  b.set(85, 43, Tile.Cabinet).set(85, 44, Tile.Cabinet);
  b.set(89, 43, Tile.Table).set(89, 44, Tile.Chair);
  b.setDetail(90, 43, Detail.Rug).setDetail(91, 43, Detail.Rug);
  b.setDetail(90, 44, Detail.Doormat).setDetail(91, 44, Detail.Doormat);
  b.set(83, 40, Tile.LampPost).set(102, 40, Tile.LampPost);
  // Two houses under one roof, and the facade admits it: the Crown's
  // weld canopy and banner west of the door, the Charter's charcoal
  // east of it — bowed canvas, the only dressed-stone finery in town.
  // The shingle stands clear of both, on the walk.
  b.sign(94, 46, 'THE CHARTERHOUSE', ['timber bought, coin kept', 'the two are not the same window'], Tile.HangingSign);
  b.set(86, 46, awningTile('bowed', 3)).set(87, 46, awningTile('bowed', 3));
  b.set(95, 46, awningTile('bowed', 7)).set(96, 46, awningTile('bowed', 7));
  b.setDetail(89, 45, wallBannerDetail(3)).setDetail(93, 45, wallBannerDetail(7));
  b.fillRect(90, 46, 2, 1, Tile.Path);

  // ---------------------------------------------------------------
  // THE PINE AND BELL — the inn, and the only warm room in forty
  // miles that will still be warm at four in the morning, because the
  // watch comes off the tower at four and has to go somewhere.
  // ---------------------------------------------------------------
  b.fillRect(74, 62, 17, 12, Tile.WoodFloor);
  b.outlineRect(74, 62, 17, 12, Tile.WallWood);
  b.set(80, 73, Tile.DoorwayWoodWide).set(81, 73, Tile.DoorwayWoodWide);
  b.set(74, 66, Tile.WallWoodWindow).set(74, 70, Tile.WallWoodWindow);
  b.set(90, 66, Tile.WallWoodWindow).set(90, 70, Tile.WallWoodWindow);
  b.set(78, 62, Tile.WallWoodWindow).set(86, 62, Tile.WallWoodWindow);
  // The common room: hearth west, the long table, the bar under it.
  b.set(75, 65, Tile.Hearth);
  b.set(78, 67, Tile.Table).set(79, 67, Tile.Table).set(80, 67, Tile.Table);
  b.set(78, 66, Tile.Chair).set(80, 66, Tile.Chair);
  b.set(79, 68, Tile.Chair).set(81, 68, Tile.Chair);
  b.setDetail(77, 70, Detail.Rug).setDetail(78, 70, Detail.Rug);
  b.setDetail(79, 63, Detail.Tapestry).setDetail(80, 63, Detail.Tapestry);
  b.set(84, 65, Tile.Counter).set(84, 66, Tile.Counter);
  b.set(84, 68, Tile.Counter).set(84, 69, Tile.Counter);
  b.set(86, 64, Tile.Barrel).set(87, 64, Tile.Barrel).set(88, 64, Tile.Crate);
  // The keeper's cot behind the bar, and the kitchen walled off east.
  b.set(89, 66, Tile.Bed).set(89, 67, Tile.Bed);
  for (let y = 68; y <= 73; y++) b.set(87, y, Tile.WallWood);
  b.set(87, 70, Tile.DoorwayWood);
  b.set(89, 69, Tile.Basin).set(89, 71, Tile.Cabinet).set(88, 72, Tile.Table);
  // The guest wing, partitioned north-west: three beds, dry blankets.
  for (let x = 75; x <= 81; x++) if (x !== 78) b.set(x, 64, Tile.WallWood);
  b.set(78, 64, Tile.DoorwayWood);
  b.set(76, 63, Tile.Bed).set(77, 63, Tile.Bed);
  b.set(79, 63, Tile.Bed);
  b.set(81, 63, Tile.Cabinet);
  b.setDetail(80, 72, Detail.Doormat).setDetail(81, 72, Detail.Doormat);
  b.set(92, 64, Tile.FlowerBox).set(92, 71, Tile.FlowerBox);
  // The inn earns its warm face: ochre board-roofs flanking the wide
  // door (snow country; the timber sheds it), the mug on its bracket,
  // and the shingle standing on the lane where the watch comes off.
  b.sign(88, 74, 'THE PINE AND BELL', ['beds, broth, and the four o clock fire'], Tile.HangingSign);
  b.set(76, 74, awningTile('board', 6)).set(77, 74, awningTile('board', 6));
  b.set(83, 74, awningTile('board', 6)).set(84, 74, awningTile('board', 6));
  b.setDetail(82, 73, bracketSignDetail(0));
  // The coaching fire on the lane: the supper fire, outside, always.
  b.set(82, 77, Tile.Campfire);
  b.set(80, 77, Tile.Bench).set(84, 77, Tile.Bench);

  // ---------------------------------------------------------------
  // PINEWATCH STORES — the chandlery of the wood: axe-heads, wedges,
  // rope, resin, boots, and the salve everyone needs by their second
  // week. Counter faces the door; the storeroom holds the rest.
  // ---------------------------------------------------------------
  b.fillRect(40, 64, 12, 9, Tile.WoodFloor);
  b.outlineRect(40, 64, 12, 9, Tile.WallWood);
  b.set(45, 64, Tile.DoorwayWood); // fronts the Mill Lane
  b.set(40, 68, Tile.WallWoodWindow).set(51, 68, Tile.WallWoodWindow);
  b.set(43, 66, Tile.Counter).set(44, 66, Tile.Counter);
  b.set(46, 66, Tile.Counter).set(47, 66, Tile.Counter);
  b.set(41, 65, Tile.Cabinet);
  for (let y = 67; y <= 72; y++) b.set(48, y, Tile.WallWood);
  b.set(48, 69, Tile.DoorwayWood);
  b.set(50, 68, Tile.Crate).set(50, 69, Tile.CrateGoods).set(50, 71, Tile.Barrel);
  b.set(41, 71, Tile.Bed).set(42, 71, Tile.Bed);
  b.set(45, 71, Tile.ToolRack);
  // The wood's answer to weather: a board rain-roof pair on the
  // south wall (cloth would hold the snow; timber sheds it), ochre-
  // trimmed, the hammer on its bracket, hopvine up the storeroom.
  b.set(43, 73, awningTile('board', 6)).set(44, 73, awningTile('board', 6));
  b.setDetail(46, 72, bracketSignDetail(7));
  b.setDetail(50, 72, trellisDetail(2));
  b.setDetail(41, 72, pennantDetail(6));
  b.setDetail(45, 65, Detail.Doormat);
  b.path({ x: 45, y: 63 }, { x: 45, y: 63 }, 1);
  // The shingle stands on the Mill Lane verge, before the door it
  // names — in front of the wall, never in it.
  b.sign(43, 63, 'PINEWATCH STORES', ['iron, rope, resin, and salve', 'the salve first, mostly'], Tile.HangingSign);

  // ---------------------------------------------------------------
  // SPARWRIGHTS' ROW — an open shed thirty tiles long, because a mast
  // is thirty tiles long. This is the only place in the Dawnlands
  // that can shape one, and everyone here knows it. The beds are the
  // long trestles the spar rides while it is worked.
  // ---------------------------------------------------------------
  b.fillRect(20, 78, 30, 9, Tile.WoodFloor);
  b.outlineRect(20, 78, 30, 9, Tile.WallWood);
  b.set(24, 78, Tile.DoorwayWoodWide).set(25, 78, Tile.DoorwayWoodWide);
  b.set(40, 78, Tile.DoorwayWoodWide).set(41, 78, Tile.DoorwayWoodWide);
  for (const wx of [22, 28, 34, 44, 48]) b.set(wx, 86, Tile.WallWoodWindow);
  b.set(20, 82, Tile.WallWoodWindow).set(49, 82, Tile.WallWoodWindow);
  for (const tx of [23, 27, 31, 35, 39, 43]) {
    b.set(tx, 80, Tile.Sawhorse).set(tx, 84, Tile.Sawhorse);
  }
  b.set(46, 80, Tile.CarvingBench).set(46, 82, Tile.Workbench);
  b.set(47, 84, Tile.ToolRack).set(21, 80, Tile.ToolRack);
  b.set(21, 84, Tile.Barrel).set(48, 79, Tile.Crate);
  b.setDetail(25, 82, Detail.Sawdust).setDetail(33, 82, Detail.Sawdust);
  b.setDetail(41, 82, Detail.Sawdust).setDetail(29, 85, Detail.Sawdust);
  // A spar rides trestles OUTSIDE the row too — the work spills onto
  // the lane verge the way thirty-tile work must — and the shingle
  // stands beside it, off the wall.
  b.sign(31, 77, "SPARWRIGHTS' ROW", ['a mast is one tree or it is firewood', 'mind the beds'], Tile.HangingSign);
  b.set(36, 77, Tile.Sawhorse).set(38, 77, Tile.Sawhorse);
  b.setDetail(37, 77, Detail.Sawdust);
  b.setDetail(26, 86, trellisDetail(2)).setDetail(38, 86, trellisDetail(2));
  // The spar-master's cot at the row's east end, behind a partition.
  for (let y = 79; y <= 86; y++) b.set(44, y, Tile.WallWood);
  b.set(44, 82, Tile.DoorwayWood);

  // ---------------------------------------------------------------
  // THE PITCH YARD — three resin kilns and the barrel line. Downwind
  // of everything on purpose, and everything still smells of it.
  // ---------------------------------------------------------------
  b.fillRect(88, 76, 18, 12, Tile.Dirt);
  for (const kx of [90, 96, 102]) {
    b.fillRect(kx, 78, 3, 3, Tile.StoneFloor);
    b.outlineRect(kx, 78, 3, 3, Tile.WallStone);
    b.set(kx + 1, 80, Tile.DoorwayStone);
    b.set(kx + 1, 79, Tile.Campfire);
  }
  b.set(90, 84, Tile.Barrel).set(91, 84, Tile.Barrel).set(92, 84, Tile.Barrel);
  b.set(96, 84, Tile.Barrel).set(97, 84, Tile.Barrel);
  b.set(102, 84, Tile.CrateGoods).set(103, 84, Tile.CrateGoods);
  b.set(94, 86, Tile.Basin).set(100, 86, Tile.ToolRack);
  b.setDetail(93, 82, Detail.Pebbles).setDetail(99, 83, Detail.Pebbles);
  b.sign(88, 82, 'THE PITCH YARD', ['no open flame past the barrels', 'we mean it, Rullo'], Tile.Signpost);
  // The pitchmaster's hut, upwind at the yard's north-west corner.
  b.fillRect(96, 64, 8, 7, Tile.WoodFloor);
  b.outlineRect(96, 64, 8, 7, Tile.WallWood);
  b.set(99, 70, Tile.DoorwayWood);
  b.set(96, 67, Tile.WallWoodWindow).set(103, 67, Tile.WallWoodWindow);
  b.set(97, 65, Tile.Bed).set(97, 66, Tile.Bed);
  b.set(102, 65, Tile.Cabinet).set(102, 68, Tile.Table).set(101, 68, Tile.Chair);
  b.setDetail(99, 68, Detail.RugRound);
  b.setDetail(99, 69, Detail.Doormat);
  // Upwind or not, the trade follows him home: hopvine up the south
  // wall and a pitch barrel by the door he swears is empty.
  b.setDetail(101, 70, trellisDetail(2));
  b.set(96, 71, Tile.Barrel);
  b.fillRect(99, 71, 1, 4, Tile.Dirt);

  // ---------------------------------------------------------------
  // THE LOW ROW — five cottages on the west side, alike the way
  // siblings are alike. Woodcutters' houses: one room, one bed, a
  // rack for the wet coats, and a doormat somebody actually beats.
  // ---------------------------------------------------------------
  const cottage = (x: number, y: number, tidy: boolean): void => {
    b.fillRect(x, y, 7, 7, Tile.WoodFloor);
    b.outlineRect(x, y, 7, 7, Tile.WallWood);
    b.set(x + 3, y + 6, Tile.DoorwayWood);
    b.set(x, y + 3, Tile.WallWoodWindow).set(x + 6, y + 3, Tile.WallWoodWindow);
    b.set(x + 1, y + 1, Tile.Bed).set(x + 1, y + 2, Tile.Bed);
    b.set(x + 5, y + 1, Tile.ToolRack);
    b.set(x + 5, y + 4, Tile.Table).set(x + 4, y + 4, Tile.Chair);
    b.setDetail(x + 3, y + 5, Detail.Doormat);
    if (tidy) {
      b.setDetail(x + 3, y + 3, Detail.Rug).setDetail(x + 4, y + 3, Detail.Rug);
      b.set(x + 1, y + 4, Tile.Cabinet);
    } else {
      b.set(x + 2, y + 4, Tile.Crate).set(x + 1, y + 5, Tile.Barrel);
    }
    b.fillRect(x + 3, y + 7, 1, 2, Tile.Dirt);
  };
  cottage(10, 66, false);
  cottage(20, 66, true);
  cottage(30, 66, false);
  cottage(55, 66, true);
  b.set(17, 64, Tile.BerryBush).set(28, 64, Tile.BerryBush);
  b.set(18, 65, Tile.FlowerBox).set(62, 70, Tile.FlowerBox);
  b.set(37, 70, Tile.TreePine).set(52, 64, Tile.TreePine);
  // Same bones, different lives, and the south walls say whose is
  // whose: the first flies work-ochre over a chopping block; the
  // second keeps a basket in bloom and roses at the corner; the third
  // flies charcoal beside a barrel it has not returned; the fourth
  // grows ivy and keeps its basket watered. Nobody planned it, which
  // is the plan.
  b.setDetail(11, 72, pennantDetail(6));
  b.set(16, 73, Tile.Stump);
  b.setDetail(21, 72, Detail.WallBasket).setDetail(25, 72, trellisDetail(1));
  b.setDetail(34, 72, pennantDetail(7));
  b.set(36, 73, Tile.Barrel);
  b.setDetail(59, 72, trellisDetail(0)).setDetail(56, 72, Detail.WallBasket);

  // ---------------------------------------------------------------
  // THE WARDLINE GATE — east, and the only gate in this town that is
  // shut more than it is open. Past it the licensed cut ends and the
  // old wood begins; the blazed pines and the boundary stones run
  // north and south from here as far as anyone has walked.
  // ---------------------------------------------------------------
  b.fillRect(103, 56, 6, 6, Tile.StoneFloor);
  b.set(104, 57, Tile.Brazier).set(104, 61, Tile.Brazier);
  b.set(108, 57, Tile.BannerPole);
  b.sign(103, 61, 'THE WARDLINE', [
    'no axe past this gate',
    'set by the town, kept by the town',
    'the old wood is not ours',
  ], Tile.Signpost);
  b.sign(109, 61, 'BEYOND', ['blazed pine and boundary stone', 'walk it if you must', 'do not cut it'], Tile.Signpost);
  // THE OLD WOOD — everything east of the curtain, and the whole point
  // of the gate. Step through and the licensed cut ends: stands nobody
  // has touched in four hundred years, close enough that a wain could
  // not turn in them, with the blazed line and its boundary stones
  // marching north and south through the middle. This is dense on
  // purpose. A gate that opens onto a lawn is a gate that means
  // nothing, and this one has to mean everything.
  for (let y = 2; y < R.h - 2; y++) {
    for (let x = 108; x < R.w; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 59.5) <= 3) continue; // the Wardline path breathes
      // THE GATE'S OWN GROUND: the town keeps a fan cut outside its
      // east gate, because a gate you cannot see out of is a window.
      // The old wood starts where the cutting stops, and that edge is
      // the whole threshold the Wardline means.
      if (x <= 117 && y >= 52 && y <= 68) continue;
      // Matched to the Pinereach's own canopy density outside the rect
      // (worldgen's ~0.30 at a taiga heart), so the wall is the only
      // seam a player ever sees. Denser than that stops reading as a
      // wood and starts reading as a wall of paint.
      const roll = pineRng(x * 3, y * 5);
      if (roll < 0.30) b.set(x, y, Tile.TreePine);
      else if (roll < 0.325) b.set(x, y, Tile.TreeYew); // the untouched ones
      else if (roll < 0.345) b.set(x, y, Tile.Rock);
      else if (roll < 0.365) b.set(x, y, Tile.WildSagewort);
      else if (roll < 0.44) b.set(x, y, Tile.GrassTall);
    }
  }
  // The blazed line itself: marked pine and pulled-up boundary stone,
  // marching north and south from the gate as far as anyone has walked.
  for (let y = 6; y <= 92; y += 5) {
    const jitter = ((y * 7) % 5) - 2;
    b.set(112 + jitter, y, Tile.Stump); // blazed, not felled: the mark
    if (y % 10 === 0) b.set(113 + jitter, y + 1, Tile.Rock);
  }
  b.set(112, 58, Tile.Grass).set(112, 60, Tile.Grass);
  // The cut fan outside the Wardline gate: stumps in rows where the
  // town takes its firewood, and the first great trunks standing just
  // past them so you can see exactly where the licence ends.
  for (const [sx, sy] of [
    [110, 54], [113, 55], [109, 64], [112, 66], [116, 53], [115, 65], [111, 68], [117, 62],
  ] as const) {
    if (b.get(sx, sy) === Tile.Grass) b.set(sx, sy, Tile.Stump);
  }
  b.set(118, 56, Tile.TreeYew).set(118, 64, Tile.TreeYew);
  b.setDetail(111, 57, Detail.Sawdust).setDetail(114, 62, Detail.Sawdust);

  // ---------------------------------------------------------------
  // THE NURSERY — the other half of the Wardline's bargain, and the
  // reason the near stands are still standing after four hundred
  // years of felling. Every wain that leaves owes seedlings back, and
  // the beds are counted the same as the boards are. The rows run
  // north-east where the morning gets at them.
  // ---------------------------------------------------------------
  for (let row = 0; row < 5; row++) {
    const y = 18 + row * 3;
    b.fillRect(88, y, 14, 1, Tile.Tilled);
    for (let x = 89; x <= 101; x += 3) b.set(x, y, Tile.SaplingPine);
  }
  b.fillRect(86, 17, 2, 16, Tile.Dirt); // the barrow walk
  b.set(84, 32, Tile.Basin).set(95, 33, Tile.Basin);
  b.set(84, 16, Tile.Barrel).set(103, 20, Tile.Crate);
  // The nursery shed: seed trays, a bench, and the count book that
  // nobody outside this fence has ever asked to see.
  b.fillRect(78, 20, 7, 6, Tile.WoodFloor);
  b.outlineRect(78, 20, 7, 6, Tile.WallWood);
  b.set(81, 25, Tile.DoorwayWood);
  b.set(78, 22, Tile.WallWoodWindow).set(84, 22, Tile.WallWoodWindow);
  b.set(79, 21, Tile.Workbench).set(83, 21, Tile.Lectern);
  b.set(79, 24, Tile.Crate).set(83, 24, Tile.Cabinet);
  b.setDetail(81, 24, Detail.Doormat);
  // The gentlest wall in town: the sprig on its bracket, ivy over the
  // count-book corner, and the shingle standing by the barrow walk.
  b.sign(83, 26, 'THE NURSERY', ['seedlings owed and seedlings set', 'the beds are counted too'], Tile.HangingSign);
  b.setDetail(79, 25, bracketSignDetail(4));
  b.setDetail(83, 25, trellisDetail(0));
  b.fillRect(81, 26, 1, 4, Tile.Dirt);

  // ---------------------------------------------------------------
  // THE FISHER STEPS — the north shore, where the town gets its
  // supper when the wains are late. Three steps, two boats' worth of
  // gear, and the one place on the water a child is allowed.
  // ---------------------------------------------------------------
  b.fillRect(86, 13, 6, 2, Tile.StoneFloor);
  b.fillRect(88, 10, 2, 4, Tile.Dock);
  b.set(89, 8, Tile.FishingSpot);
  b.set(85, 14, Tile.Barrel).set(92, 14, Tile.Crate);
  b.set(93, 13, Tile.ToolRack);
  b.set(85, 16, Tile.Bench);
  b.sign(92, 15, 'THE FISHER STEPS', ['the ice is never ready', 'ask anyone who is not here'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE WAIN BAYS — the Charterhouse's loading ground: three rails,
  // the weighbeam, and the board stacks that came up the Mill Lane
  // this morning. Everything Pinewatch sells leaves from here.
  // ---------------------------------------------------------------
  b.fillRect(84, 50, 20, 8, Tile.Dirt);
  for (let x = 86; x <= 90; x++) b.set(x, 51, Tile.RailWood);
  for (let x = 93; x <= 97; x++) b.set(x, 51, Tile.RailWood);
  for (let x = 100; x <= 103; x++) b.set(x, 51, Tile.RailWood);
  b.set(88, 53, Tile.Basin).set(95, 53, Tile.Basin);
  b.set(85, 55, Tile.CrateGoods).set(86, 55, Tile.CrateGoods);
  b.set(89, 56, Tile.CrateGoods).set(90, 56, Tile.CrateGoods);
  b.set(99, 55, Tile.Barrel).set(102, 56, Tile.Crate);
  b.set(93, 55, Tile.Lectern); // the weighbeam's book
  b.setDetail(87, 52, Detail.Straw).setDetail(94, 52, Detail.Straw);
  b.set(83, 52, Tile.LampPost);
  b.sign(97, 57, 'THE WAIN BAYS', ['loads weighed here and nowhere else', 'the Charter counts, the Crown watches'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE CORDWOOD YARD — the town's own fuel, stacked by the roof that
  // owes it. Nobody in Pinewatch has ever been cold indoors and
  // nobody intends to start.
  // ---------------------------------------------------------------
  b.fillRect(52, 78, 10, 9, Tile.Dirt);
  for (let y = 79; y <= 85; y += 2) {
    b.set(53, y, Tile.Stump).set(54, y, Tile.Stump);
    b.set(58, y, Tile.Stump).set(59, y, Tile.Stump);
  }
  b.set(56, 80, Tile.Sawhorse).set(56, 84, Tile.Sawhorse);
  b.set(61, 79, Tile.ToolRack);
  b.setDetail(56, 82, Detail.Sawdust).setDetail(57, 79, Detail.Sawdust);
  b.sign(52, 77, 'THE CORDWOOD', ['a cord a roof, before the first frost'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE SKIDWAY — the dragged track from the boom's shore up to the
  // log deck, worn to bare earth by four hundred years of the same
  // work. Stumps and stacks all the way along it.
  // ---------------------------------------------------------------
  b.fillRect(44, 30, 4, 3, Tile.Dirt);
  b.fillRect(44, 30, 14, 2, Tile.Dirt);
  b.set(49, 33, Tile.Stump).set(52, 34, Tile.Stump).set(55, 32, Tile.Stump);
  b.set(47, 28, Tile.Crate).set(56, 29, Tile.Barrel);
  b.setDetail(48, 31, Detail.Sawdust).setDetail(53, 30, Detail.Sawdust);

  // ---------------------------------------------------------------
  // THE CURTAIN — timber-town garrison work on the three land sides,
  // dying into the water at both ends (the harbor-mole law; here the
  // Glasswater is the fourth wall and the town's entire argument).
  // Three gates: the Timber Road south, the Sparway west, the
  // Wardline east.
  // ---------------------------------------------------------------
  // West curtain: from the reed bay south to the corner.
  for (let y = 42; y <= 87; y++) b.set(6, y, Tile.WallGarrison);
  b.set(6, 48, Tile.GateGarrison).set(6, 49, Tile.GateGarrison).set(6, 50, Tile.GateGarrison);
  b.set(5, 41, Tile.WallGarrisonDiagSE);
  // South curtain, with the Timber Road's gate.
  b.fillRect(7, 88, 56, 1, Tile.WallGarrison);
  b.set(63, 88, Tile.GateGarrison).set(64, 88, Tile.GateGarrison).set(65, 88, Tile.GateGarrison);
  b.fillRect(66, 88, 41, 1, Tile.WallGarrison);
  // The Timber Road gate wears the watch's charcoal on both cheeks —
  // iron colors over the gate fires; the rest of the curtain keeps
  // its martial bareness.
  b.setDetail(62, 88, wallBannerDetail(7)).setDetail(66, 88, wallBannerDetail(7));
  // East curtain, north from the corner to the water, with the
  // Wardline gate in it.
  for (let y = 8; y <= 88; y++) b.set(106, y, Tile.WallGarrison);
  b.set(106, 59, Tile.GateGarrison).set(106, 60, Tile.GateGarrison);
  b.set(107, 89, Tile.WallGarrisonDiagNW);
  b.set(105, 7, Tile.WallGarrisonDiagSE);
  b.fillRect(97, 7, 8, 1, Tile.WallGarrison); // the short north run, into the lake
  // The gate fires: every gate in this town burns something at night.
  b.set(61, 90, Tile.Brazier).set(67, 90, Tile.Brazier);
  b.set(8, 46, Tile.Brazier).set(8, 52, Tile.Brazier);
  b.sign(60, 87, 'PINEWATCH', [
    'timber out, iron in',
    'the watch is kept nightly',
    'every roof takes a night',
  ], Tile.Signpost);
  b.sign(9, 51, 'THE SPARWAY', [
    'this is the short road',
    'it is short for a reason',
    'the Timber Road is longer and older and alive',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // SOFT EDGES — the Pinereach coming in over the walls. Pine takes
  // every corner the town has not paved, and the border hem is solid
  // wood on three sides: this town is a clearing, and the clearing is
  // the only thing holding.
  // ---------------------------------------------------------------
  b.set(52, 33, Tile.TreePine).set(84, 30, Tile.TreePine).set(50, 58, Tile.TreePine);
  b.set(16, 55, Tile.TreePine).set(100, 54, Tile.TreePine).set(72, 84, Tile.TreePine);
  b.set(54, 74, Tile.TreePine).set(38, 68, Tile.TreePine);
  b.set(62, 58, Tile.SaplingPine).set(63, 68, Tile.SaplingPine).set(52, 72, Tile.SaplingPine);
  b.set(70, 66, Tile.Rock).set(24, 36, Tile.Rock);
  b.set(44, 45, Tile.Stump).set(47, 46, Tile.Stump).set(52, 44, Tile.Stump);
  b.set(38, 33, Tile.Crate).set(41, 32, Tile.Barrel);
  b.setDetail(45, 45, Detail.Sawdust).setDetail(50, 45, Detail.Sawdust);
  b.set(19, 44, Tile.Rock).set(15, 50, Tile.TreePine).set(11, 46, Tile.TreePine);
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Tuft, 0.06);
  b.scatterDetail(Detail.Flowers, 0.02);
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      if (b.levelAt(x, y) !== 0) continue;
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(x - 64) <= 4 && y >= 88) continue; // the south gate breathes
      if (Math.abs(y - 49) <= 3 && x <= 7) continue; // the west gate breathes
      if (Math.abs(y - 60) <= 3 && x >= 106) continue; // the Wardline path breathes
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.34 : edge < 7 ? 0.14 : 0;
      if (density > 0 && pineRng(x, y) < density) {
        b.set(x, y, pineRng(x + 1000, y) < 0.15 ? Tile.Rock : Tile.TreePine);
      }
    }
  }

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // THE TIMBER DOOR (the Red Company epic): the reed bank at the
  // millrace mouth, where nobody works and boats beach quiet on the
  // sand. A hatch, a crate, no lamp, no sign, no name.
  // ---------------------------------------------------------------
  b.fillRect(13, 42, 4, 4, Tile.Dirt);
  b.portal(14, 43, Tile.PortalDown, { x: 217.5, y: 594.5 }); // the Pinewatch alcove
  b.set(16, 42, Tile.Crate).set(13, 45, Tile.Rock);
  b.setDetail(15, 44, Detail.Pebbles).setDetail(13, 43, Detail.Tuft);

  // THE PEOPLE — twenty-one lives on the saw's clock and the rota's.
  // Placements are the POST each routine measures from; the sleepers
  // walk to real beds by way of a walkable cardinal neighbour (the
  // cardinal-stand law), so nobody wedges on a bedpost at midnight.
  // ---------------------------------------------------------------
  b.actor('reeve_halla', 62.5, 50.5, Math.PI / 2, 'pine_reeve');
  b.actor('old_torvi', 68.5, 52.5, Math.PI / 2, 'pine_elder');
  b.actor('sawmistress_groa', 33.5, 47.5, Math.PI / 2, 'pine_sawmistress');
  b.actor('sparmaster_yannick', 32.5, 82.5, Math.PI / 2, 'pine_sparmaster');
  b.actor('smith_vigga', 49.5, 37.5, Math.PI / 2, 'pine_smith');
  b.actor('innkeep_sunniva', 85.5, 67.5, Math.PI, 'pine_innkeep');
  b.actor('pitchmaster_rullo', 96.5, 82.5, Math.PI / 2, 'pine_pitchmaster');
  b.actor('factor_ebba', 88.5, 43.5, Math.PI, 'pine_factor');
  b.actor('buyer_ospren', 87.5, 37.5, Math.PI / 2, 'pine_buyer');
  b.actor('storekeep_nial', 45.5, 67.5, -Math.PI / 2, 'pine_storekeep');
  b.actor('tallyman_bram', 72.5, 23.5, Math.PI / 2, 'pine_tallyman');
  b.actor('boomsman_kettil', 60.5, 24.5, Math.PI / 2, 'pine_boomsman');
  b.actor('nurseryman_odd', 94.5, 25.5, Math.PI / 2, 'pine_nurseryman');
  b.actor('warden_sigrun', 64.5, 84.5, Math.PI / 2, 'pine_warden');
  b.actor('fisher_ylva', 88.5, 12.5, -Math.PI / 2, 'pine_fisher');
  b.actor('pinewatch_watch', 66.5, 43.5, Math.PI / 2, 'pine_watch');
  // THE SADDLE IN THE SCHEDULE: the mountain Waykeeper rides the
  // Watch Road on a garron, yard to the Timber Road gate and back.
  b.actor('outrider_haldis', 65.5, 58.5, -Math.PI / 2, 'pine_outrider');
  b.actor('pinewatch_watch', 64.5, 86.5, Math.PI / 2, 'pine_watch');
  b.actor('pinewatch_watch', 104.5, 60.5, Math.PI / 2, 'pine_watch');
  b.actor('pinewatch_sawyer', 35.5, 45.5, Math.PI / 2, 'pine_sawyer');
  b.actor('pinewatch_sawyer', 28.5, 80.5, Math.PI / 2, 'pine_sawyer');
  b.actor('pinewatch_sawyer', 52.5, 30.5, Math.PI / 2, 'pine_sawyer');
  b.npcSpawn('chicken', 24, 60.5, 2, 3);

  b.spawn(66.5, 50.5); // the muster yard: the respawn hearth of the north-east
  return b.build();
}

/** Stable per-tile hash so the town is byte-identical every boot. */
function pineRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x9e17;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 0xffffffff;
}
