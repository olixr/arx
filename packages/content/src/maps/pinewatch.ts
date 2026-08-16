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
import { UNDERWORLD_PLANE_ID } from '../planes.js';
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
 *  - STREETS FIRST. The Watch Road runs the spine, knoll to the
 *    Southway; the Shore Lane runs the whole working waterfront;
 *    Sparwrights' Lane, the Wardline Path, the Gate Lane, and the
 *    Fort Lane hang off them. Every building fronts a street, with
 *    >= 3 open tiles between structures.
 *  - A DIAGONAL BUDGET OF TWO, both on the Old Watch's knoll: the
 *    tower's south shoulders. Everything else is honest square,
 *    because everything else was built by people with a saw and a
 *    quota.
 *  - ROOM INTENT. One job per room, furniture proves it.
 *
 * THE WATER PLAN (PINEWATCH REMADE — the town finally admits what it
 * sits on): a fortress isthmus. The Glasswater is the whole west and
 * north-west — the reed bay, the millrace, the timber strand, THE
 * BOOM, the raft dock, the fisher steps, and south of the working
 * shore THE WINTER STRAND, the open beach the ice-road forms on in a
 * hard year. The southern TARN owns the whole south-east; the curtain
 * dies into it twice. Between the waters, two ROCK-CUT GATES bracket
 * the town: the Timber Gate in the ridge cut the road itself carved,
 * and the Hartgate in the pass notch where the drovers' road climbs
 * to Hartfell. Nothing crosses the open water. Except in a hard
 * winter — which is what the watch is FOR, and now also what the
 * Northguard is paid for.
 *
 * Anchors that must NOT move (routines and other epics hang off
 * them): the Old Watch tower and its bell, the muster yard and the
 * rota board, the boom and both piers, the millrace, the Wardline
 * gate, every door, every bed, every station, and the Timber Door
 * hatch at local (14,43) — the Red Company's, byte-exact. The Timber
 * Road's carve crosses the south hem at local x~32 and the Hartway
 * leaves at local (124,0) = world (1220,-404); both mouths meet the
 * carved routes tile-exact.
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
  // THE WEST SHORE — the Glasswater runs down the WHOLE west hem (the
  // regen's truth, finally authored): open water laps inside the
  // border, a wading margin, and then THE WINTER STRAND — the long
  // sand where boats are drawn up and the ice-road forms in a hard
  // year. The lake is the wall here; the town has always said so and
  // now the map agrees. The old west curtain and its drowned gate are
  // gone — the Sparway rejoined the Timber Road leagues ago, and a
  // wall against open water was a wall against nothing.
  // ---------------------------------------------------------------
  for (let y = 42; y <= 137; y++) {
    const w = 1 + Math.round((Math.sin(y * 0.55) + 1) / 2); // 1..2 wet columns
    for (let x = 0; x <= w; x++) b.set(x, y, Tile.Water);
    b.set(w + 1, y, Tile.WaterShallow).set(w + 2, y, Tile.WaterShallow);
    for (let x = w + 3; x <= 9; x++) b.set(x, y, Tile.Sand);
  }
  // South of y137 the shore swings west out of the rect; the strand
  // narrows to a worked sand hem and hands the lake back to the field.
  for (let y = 138; y <= 146; y++) {
    b.set(0, y, Tile.Water).set(1, y, Tile.WaterShallow);
    for (let x = 2; x <= 6; x++) b.set(x, y, Tile.Sand);
  }
  for (let y = 147; y < R.h; y++) {
    for (let x = 0; x <= 5; x++) b.set(x, y, Tile.Sand);
  }
  // Reeds where the strand meets the old reed corner's soakaway, and
  // along the wading margin the shore loop re-dealt.
  b.set(4, 46, Tile.FibrePlant).set(3, 52, Tile.Swamp).set(5, 58, Tile.FibrePlant);
  b.set(4, 92, Tile.Swamp).set(2, 96, Tile.Swamp).set(5, 101, Tile.FibrePlant);
  b.set(3, 118, Tile.FibrePlant).set(2, 128, Tile.Swamp);
  b.set(5, 126, Tile.FishingSpot); // the strand's quiet line

  // ---------------------------------------------------------------
  // THE TARN — the southern water, and the town's other wall. The
  // regen deals it just here (measured, not guessed: the fine scan of
  // 2026-08-16); the zone authors its north-west shore so the hem
  // hands the water off seam-true. Reeds, one bench someday, and
  // nothing else: the Tarnside is deliberately the quietest ground
  // in town.
  // ---------------------------------------------------------------
  const tarnEdge = (y: number): number => {
    // West edge of the water at row y (local), following the measured
    // worldgen shore so the south and east hems agree with the field.
    if (y < 114) return 999;
    if (y <= 115) return 88;
    if (y <= 117) return 83;
    if (y <= 119) return 80;
    if (y <= 121) return 78;
    if (y <= 123) return 76;
    if (y <= 125) return 73;
    if (y <= 127) return 70;
    if (y <= 129) return 66;
    if (y <= 131) return 62;
    if (y <= 133) return 58;
    if (y <= 135) return 56;
    if (y <= 141) return 54;
    if (y <= 143) return 55;
    if (y <= 145) return 56;
    if (y <= 147) return 57;
    if (y <= 149) return 59;
    return 62;
  };
  for (let y = 114; y < R.h; y++) {
    const e = tarnEdge(y) + Math.round(Math.sin(y * 0.9) * 1.2);
    for (let x = e; x < R.w; x++) {
      // Deepen toward the heart (south-east); the rim wades.
      const deep = x > e + 6 && y > 122;
      b.set(x, y, deep ? Tile.WaterDeep : Tile.Water);
    }
    b.set(e, y, Tile.WaterShallow);
    if (e + 1 < R.w) b.set(e + 1, y, Tile.WaterShallow);
  }
  // The tarn's reed hem — the shore grass goes tall and wet.
  for (let y = 114; y < R.h - 1; y += 2) {
    const e = tarnEdge(y) + Math.round(Math.sin(y * 0.9) * 1.2);
    if (e - 1 >= 0 && b.get(e - 1, y) === Tile.Grass) b.set(e - 1, y, Tile.GrassTall);
    if (y % 6 === 0 && e - 2 >= 0 && b.get(e - 2, y) === Tile.Grass) b.set(e - 2, y, Tile.Swamp);
    if (y % 8 === 2 && e - 2 >= 0 && b.get(e - 2, y) === Tile.Grass) b.set(e - 2, y, Tile.FibrePlant);
  }
  b.set(90, 118, Tile.FishingSpot); // the tarn gives perch, sometimes

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
  b.set(63, 52, Tile.Bench).set(69, 52, Tile.StoneBench).set(66, 54, Tile.Bench); // the elders' seat went to stone the year Torvi stopped arguing about it
  b.set(56, 48, Tile.LampPost).set(78, 48, Tile.LampPost);
  b.set(56, 54, Tile.LampPost).set(78, 54, Tile.LampPost);
  b.set(72, 50, Tile.WaterTrough); // the yard trough (UPGRADE BEFORE ADD: staved, not stone)
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
  b.path({ x: 65, y: 56 }, { x: 65, y: 113 }, 3); // the Watch Road: yard -> the Southway
  b.path({ x: 44, y: 48 }, { x: 104, y: 48 }, 2); // the Shore Lane: yard hem -> Charterhouse
  b.path({ x: 8, y: 62 }, { x: 64, y: 62 }, 2); // the Mill Lane: the west spine
  b.path({ x: 20, y: 75 }, { x: 100, y: 75 }, 2); // Sparwrights' Lane
  b.path({ x: 66, y: 60 }, { x: 105, y: 60 }, 2); // the Wardline Path
  b.path({ x: 32, y: 56 }, { x: 32, y: 61 }, 2); // the Saw Track, down to the Mill Lane
  b.path({ x: 93, y: 61 }, { x: 93, y: 74 }, 2); // the Kiln Track
  // THE SOUTHREACH's streets (the growth): the Southway crosses the
  // new quarter east-west; the Gate Lane drops from it to the Timber
  // Gate in the cut; the Strand Walk runs the shore the whole way; the
  // Fort Lane threads between the Charterhouse and the curtain up to
  // the Northguard's town door.
  b.path({ x: 16, y: 112 }, { x: 66, y: 112 }, 2); // the Southway
  b.path({ x: 32, y: 114 }, { x: 32, y: 139 }, 3); // the Gate Lane, into the cut
  b.path({ x: 8, y: 63 }, { x: 8, y: 131 }, 2); // the Strand Walk
  b.path({ x: 102, y: 28 }, { x: 102, y: 47 }, 2); // the Fort Lane
  b.fillRect(31, 141, 3, 11, Tile.Path); // the south mouth: the cut meets the Timber Road
  b.fillRect(121, 0, 3, 5, Tile.Path); // the north mouth: the Hartgate meets the Hartway
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
  b.set(27, 53, Tile.Crate).set(28, 53, Tile.Crate).set(40, 53, Tile.BarrelStack);
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
  for (const [cx, cy] of [[30, 57], [26, 59]] as const) {
    b.set(cx, cy, Tile.CrateGoods).set(cx + 1, cy, Tile.CrateGoods);
  }
  // The board yard finally racks its boards like the trade it is.
  b.set(26, 57, Tile.LumberRack).set(30, 59, Tile.LumberRack).set(34, 58, Tile.LumberRack);
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
  b.set(52, 40, Tile.QuenchTrough); // the quench, coopered and blade-bitten
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
  b.set(83, 40, Tile.LampPost).set(104, 40, Tile.LampPost); // east lamp clear of the Fort Lane
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
  b.set(86, 64, Tile.TapCask).set(87, 64, Tile.Barrel).set(88, 64, Tile.Crate);
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
  b.set(90, 84, Tile.Barrel).set(91, 84, Tile.BarrelStack).set(92, 84, Tile.Barrel);
  b.set(96, 84, Tile.Barrel).set(97, 84, Tile.Barrel);
  b.set(102, 84, Tile.CrateGoods).set(103, 84, Tile.CrateGoods);
  b.set(94, 86, Tile.WaterCask).set(100, 86, Tile.ToolRack); // fire water, staved and full
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
  // marching south from the gate as far as anyone has walked. Its
  // NORTH anchor is new: the line's first stone is the Northguard's
  // cornerstone — the fort stands on the boundary it was sent to
  // watch, which both parties considered the other side's concession.
  for (let y = 32; y <= 92; y += 5) {
    const jitter = ((y * 7) % 5) - 2;
    b.set(112 + jitter, y, Tile.Stump); // blazed, not felled: the mark
    if (y % 10 === 0) b.set(113 + jitter, y + 1, Tile.Rock);
  }
  b.set(110, 30, Tile.Rock); // the first stone, at the fort's shadow
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
  // The Wardline's other half, made visible where everyone passes it:
  // fell inside the line, plant what you fell. The cut fan's stumps
  // stand among their own replacements.
  b.set(110, 56, Tile.SaplingPine).set(114, 54, Tile.SaplingPine).set(116, 58, Tile.SaplingPine);
  b.set(112, 63, Tile.SaplingPine).set(109, 66, Tile.SaplingPine).set(115, 66, Tile.SaplingPine);

  // ---------------------------------------------------------------
  // THE NURSERY — the other half of the Wardline's bargain, and the
  // reason the near stands are still standing after four hundred
  // years of felling. Every wain that leaves owes seedlings back, and
  // the beds are counted the same as the boards are. The rows run
  // north-east where the morning gets at them.
  // ---------------------------------------------------------------
  // (PINEWATCH REMADE: the beds trimmed their east columns to x<=96 —
  // the Northguard's west wall stands at x98 now, and the nursery
  // works in the fort's shadow. Neither party planned the adjacency;
  // both have decided it means something.)
  for (let row = 0; row < 5; row++) {
    const y = 18 + row * 3;
    b.fillRect(88, y, 9, 1, Tile.Tilled);
    for (let x = 89; x <= 95; x += 3) b.set(x, y, Tile.SaplingPine);
  }
  b.fillRect(86, 17, 2, 16, Tile.Dirt); // the barrow walk
  b.set(84, 32, Tile.WaterCask).set(95, 33, Tile.WaterCask); // drawn water for the beds (PERIOD TRUTH)
  b.set(84, 16, Tile.Barrel).set(85, 16, Tile.Crate);
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
  b.set(85, 55, Tile.CrateStack).set(86, 55, Tile.CrateGoods);
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
  // THE CURTAIN — timber-town garrison work where there is land to
  // guard, and open water everywhere there is not (the harbor-mole
  // law, kept twice over: the wall dies into the Glasswater at the
  // fort's shoulder and into the tarn at both its own ends). Four
  // ways in now: the Timber Gate in the southern cut, the Hartgate in
  // the northern notch, the Wardline east — and the Winter Strand,
  // which is not a gate eleven months of the year.
  // ---------------------------------------------------------------

  // THE RIDGE — the rock spine worldgen deals across the Southreach,
  // authored so the wall inside matches the country outside. The
  // Timber Road's own carve climbs through its west shoulder: THE
  // CUT, and the gate stands in it.
  for (let y = 100; y <= 151; y++) {
    for (let x = 34; x <= 52; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall && t !== Tile.Sand) continue;
      const spine = 43 + Math.round(Math.sin(y * 0.35) * 3);
      const d = Math.abs(x - spine);
      const dens = d <= 3 ? 0.6 : d <= 6 ? 0.32 : 0.12;
      if (pineRng(x * 7, y * 11) < dens) b.set(x, y, Tile.Rock);
    }
  }
  // The cut's cheeks: the lane walks between living stone. East cheek
  // dense (the ridge proper), west cheek broken.
  for (let y = 128; y <= 151; y++) {
    if (b.get(34, y) !== Tile.Path) b.set(34, y, Tile.Rock);
    if (b.get(35, y) !== Tile.Path && pineRng(35, y) < 0.7) b.set(35, y, Tile.Rock);
    if (y >= 134 && b.get(29, y) !== Tile.Path && pineRng(29, y) < 0.55) b.set(29, y, Tile.Rock);
    if (y >= 141 && b.get(28, y) !== Tile.Path && pineRng(28, y) < 0.4) b.set(28, y, Tile.Rock);
  }

  // THE ORE CUT — the mountain pays in iron what the wood pays in
  // years. A worked face on the ridge's north brow: the town's young
  // seam, found the year the Crown's fort went up, which everyone
  // agrees is a coincidence. The bloomery and the Ironmaster's hut
  // come with the Southreach's buildings; the stone is cut now.
  b.fillRect(38, 104, 12, 8, Tile.Dirt); // the quarry terrace
  for (let x = 38; x <= 49; x++) b.set(x, 103, Tile.Rock); // the face
  b.set(40, 103, Tile.RockIron).set(44, 103, Tile.RockIron).set(48, 103, Tile.RockIron);
  b.set(39, 112, Tile.Rock).set(43, 113, Tile.Rock).set(47, 112, Tile.Rock); // the spoil lip

  // South curtain: strand to tarn, the Timber Gate in the cut. The
  // west end stands in the wading margin; the east end walks into the
  // tarn. Both deaths are the design.
  b.fillRect(2, 140, 29, 1, Tile.WallGarrison); // x2-30
  b.set(31, 140, Tile.GateGarrison).set(32, 140, Tile.GateGarrison).set(33, 140, Tile.GateGarrison);
  b.fillRect(34, 140, 20, 1, Tile.WallGarrison); // x34-53, threading the ridge foot
  // The gate wears the watch's charcoal on both cheeks — iron colors
  // over the gate fires; the rest of the curtain keeps its bareness.
  b.setDetail(30, 140, wallBannerDetail(7)).setDetail(34, 140, wallBannerDetail(7));
  b.set(29, 142, Tile.Brazier).set(36, 142, Tile.Brazier); // the gate fires
  b.set(30, 137, Tile.LampPost); // the lane's last lamp, inside
  b.sign(26, 143, 'PINEWATCH', [
    'timber out, iron in',
    'the watch is kept nightly',
    'every roof takes a night',
  ], Tile.Signpost);

  // THE SHORE BASTION — the one piece of garrison work on the open
  // west face: a raised platform over the Winter Strand, because when
  // the water goes hard, that beach is a gate, and the town has known
  // it for forty years. Braziers laid ready. Never lit in summer.
  b.raise(10, 118, 5, 5, 1);
  b.stairs(12, 122);
  b.set(11, 119, Tile.Brazier).set(13, 119, Tile.Brazier);
  b.sign(15, 123, 'THE SHORE BASTION', [
    'when the water goes hard, this beach is a gate',
    'the braziers stay fed. ask Torvi why',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE SOUTHREACH — the grown quarter, laid out the way the town
  // lays everything out: streets first, one job per roof, and the
  // water deciding what stands where. West of the ridge, the hunters
  // and the road trade; on the ridge, the iron; east of the Watch
  // Road, the green and the quiet slope to the tarn.
  // ---------------------------------------------------------------

  // THE HUNTERS' HALL — the cull rota's own roof. The wolf count
  // lives here, the winter gear lives here, and the leather trade the
  // wood always promised finally has a counter. Kolbrun keeps it.
  b.building(12, 100, 11, 11, {
    wall: Tile.WallWood, floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 5 }],
    windows: [{ side: 'w', at: 5 }, { side: 'e', at: 5 }, { side: 'n', at: 3 }, { side: 'n', at: 7 }],
  });
  b.set(13, 101, Tile.Hearth);
  b.set(15, 104, Tile.Table).set(16, 104, Tile.Table).set(17, 104, Tile.Table);
  b.set(15, 103, Tile.Chair).set(17, 103, Tile.Chair).set(16, 105, Tile.Chair);
  b.set(20, 101, Tile.WeaponRack).set(20, 103, Tile.ToolRack);
  b.set(13, 106, Tile.CarvingBench); // the skinning bench
  b.set(14, 108, Tile.Counter).set(15, 108, Tile.Counter); // the leather counter
  b.set(20, 107, Tile.Bed).set(20, 108, Tile.Bed); // the master hunter's corner
  b.set(13, 108, Tile.Cabinet);
  b.setDetail(17, 109, Detail.Doormat).setDetail(16, 106, Detail.Rug).setDetail(17, 106, Detail.Rug);
  b.sign(20, 111, "THE HUNTERS' HALL", [
    'the cull is a rota, not a sport',
    'wolves are counted, not collected',
  ], Tile.HangingSign);
  b.set(13, 114, Tile.TargetDummy); // the practice butt, across the way
  b.setDetail(14, 114, Detail.Sawdust);

  // THE FLETCHER — Espen's. Arrows by the dozen, bows by the season,
  // and the best dozen kept back for reasons he strings but never
  // says.
  b.building(26, 100, 7, 8, {
    wall: Tile.WallWood, floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 3 }],
    windows: [{ side: 'w', at: 3 }, { side: 'n', at: 2 }, { side: 'n', at: 4 }],
  });
  b.set(27, 102, Tile.FletchersBench);
  b.set(27, 104, Tile.Workbench);
  b.set(29, 104, Tile.Counter).set(30, 104, Tile.Counter);
  b.set(31, 101, Tile.Bed).set(31, 102, Tile.Bed);
  b.set(31, 105, Tile.Crate);
  b.setDetail(29, 106, Detail.Doormat);
  b.sign(31, 108, 'THE FLETCHER', [
    'arrows by the dozen, bows by the season',
    'every stave remembers its tree',
  ], Tile.HangingSign);
  b.fillRect(29, 108, 1, 3, Tile.Dirt);

  // THE WAYFARERS' GROUND — inside the wall, because the north does
  // not deserve strangers. A fire, a lean-to, and the gate lamp in
  // sight: the town's whole opinion of hospitality.
  b.set(18, 117, Tile.WayfarersRest);
  b.set(20, 118, Tile.Campfire);
  b.set(22, 119, Tile.Bench).set(18, 120, Tile.Stump);

  // THE DROVE YARD — every herd bound for Hartfell stages here, and
  // every drover learns Sylvi counts them in and counts them out.
  b.building(24, 119, 6, 6, {
    wall: Tile.WallWood, floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 2 }],
    windows: [{ side: 'e', at: 2 }],
  });
  b.set(25, 120, Tile.Bed).set(25, 121, Tile.Bed);
  b.set(28, 120, Tile.Cabinet);
  b.set(28, 122, Tile.Table).set(27, 122, Tile.Chair);
  b.setDetail(26, 120, Detail.Doormat);
  for (let x = 23; x <= 30; x++) {
    if (x !== 26 && x !== 27) b.set(x, 127, Tile.RailWood);
    b.set(x, 135, Tile.RailWood);
  }
  for (let y = 128; y <= 134; y++) b.set(23, y, Tile.RailWood).set(30, y, Tile.RailWood);
  b.setDetail(25, 130, Detail.Straw).setDetail(28, 132, Detail.Straw).setDetail(26, 129, Detail.Straw);
  b.sign(21, 126, 'THE DROVE YARD', [
    'stock staged for the fell road',
    'counted in, counted out',
  ], Tile.Signpost);

  // THE IRONMASTER — Torger's hut in the stones, and the bloomery on
  // the terrace above. The seam was found the year the fort went up,
  // which everyone agrees is a coincidence.
  for (let y = 112; y <= 115; y++) {
    for (let x = 38; x <= 40; x++) {
      if (b.get(x, y) === Tile.Rock) b.set(x, y, Tile.Grass);
    }
  }
  b.fillRect(39, 112, 1, 4, Tile.Dirt); // the barrow track down from the terrace
  b.building(36, 116, 7, 6, {
    wall: Tile.WallWood, floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 3 }],
    windows: [{ side: 'w', at: 2 }],
  });
  b.set(37, 117, Tile.Bed).set(37, 118, Tile.Bed);
  b.set(41, 117, Tile.Cabinet);
  b.set(41, 119, Tile.Table).set(40, 119, Tile.Chair);
  b.setDetail(39, 117, Detail.Doormat);
  b.set(41, 108, Tile.Furnace); // the bloomery
  b.set(44, 109, Tile.Barrel).set(45, 106, Tile.Crate);
  b.setDetail(42, 106, Detail.Pebbles).setDetail(40, 110, Detail.Pebbles);
  b.sign(37, 110, 'THE ORE CUT', [
    'the mountain pays in iron',
    'what the wood pays in years',
  ], Tile.Signpost);

  // THE GREEN — the meadow band the pitch yard's smell blows over,
  // which is why it was free to be a commons. The physic garden at
  // its west end: the salve Nial's shelf has always promised, made
  // twenty paces away.
  b.path({ x: 67, y: 107 }, { x: 98, y: 107 }, 2); // the Green Lane
  b.building(74, 98, 8, 7, {
    wall: Tile.WallWood, floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 3 }],
    windows: [{ side: 'w', at: 3 }, { side: 'e', at: 3 }, { side: 'n', at: 2 }, { side: 'n', at: 5 }],
  });
  b.set(75, 99, Tile.Bed).set(75, 100, Tile.Bed);
  b.set(79, 99, Tile.Hearth);
  b.set(80, 102, Tile.Table).set(79, 102, Tile.Chair);
  b.set(80, 99, Tile.Cabinet);
  b.setDetail(77, 103, Detail.Doormat);
  b.fillRect(77, 105, 1, 2, Tile.Dirt);
  b.fillRect(70, 100, 3, 1, Tile.Tilled);
  b.fillRect(70, 102, 3, 1, Tile.Tilled);
  b.fillRect(70, 104, 3, 1, Tile.Tilled);
  b.set(70, 98, Tile.WildSagewort).set(73, 105, Tile.WildSagewort);
  b.sign(80, 105, 'THE PHYSIC GARDEN', [
    'salve, tincture, and honest advice',
    'the salve first, mostly',
  ], Tile.HangingSign);
  // Two more roofs on the green, cut from the Low Row's cloth — the
  // town grows the way it always grew, alike the way siblings are.
  cottage(86, 98, true);
  cottage(96, 98, false);
  // The Tarnside: one bench, facing the water. Nothing else is
  // planned here. That is the plan.
  b.set(92, 111, Tile.Bench);
  b.set(89, 112, Tile.Stump);
  // Street lamps where the new lanes meet the dark.
  b.set(24, 110, Tile.LampPost).set(52, 113, Tile.LampPost);
  b.set(72, 108, Tile.LampPost).set(94, 108, Tile.LampPost);
  b.set(20, 122, Tile.LampPost);

  // East curtain: from the Northguard's south wall down to the tarn,
  // with the Wardline gate in it. The wall's south foot stands in the
  // tarn's wading margin.
  for (let y = 28; y <= 113; y++) b.set(106, y, Tile.WallGarrison);
  b.set(106, 59, Tile.GateGarrison).set(106, 60, Tile.GateGarrison);

  // ---------------------------------------------------------------
  // THE NORTHGUARD — the Crown's fort astride the pass, and the
  // NORTH WICKET the drovers' road was always owed. The Hartway
  // climbs from here through the notch to Hartfell; whatever comes
  // DOWN that road in a bad year meets this first. The fort's west
  // wall stands at the nursery's last bed — the watch and the
  // planting, shoulder to shoulder, which neither party planned and
  // both have decided means something.
  // (The shell stands with the ground; the garrison moves in with its
  // own phase.)
  // ---------------------------------------------------------------
  // The notch's rock shoulders, continuing the crags the field deals
  // just outside the hem.
  for (let y = 0; y <= 4; y++) {
    for (const x of [117, 118, 119, 120, 124, 125, 126, 127]) {
      if (b.get(x, y) === Tile.Grass || b.get(x, y) === Tile.GrassTall) {
        if (pineRng(x * 13, y * 17) < 0.75) b.set(x, y, Tile.Rock);
      }
    }
  }
  b.fillRect(99, 6, 27, 21, Tile.Dirt); // the parade ground
  // Walls: north (with the Hartgate), east, south (with the town
  // door onto the Fort Lane), west (dying toward the water).
  b.fillRect(98, 5, 23, 1, Tile.WallGarrison); // x98-120
  b.set(121, 5, Tile.GateGarrison).set(122, 5, Tile.GateGarrison).set(123, 5, Tile.GateGarrison);
  b.fillRect(124, 5, 3, 1, Tile.WallGarrison); // x124-126
  for (let y = 6; y <= 26; y++) b.set(126, y, Tile.WallGarrison);
  b.fillRect(98, 27, 29, 1, Tile.WallGarrison); // x98-126
  b.set(101, 27, Tile.GateGarrison).set(102, 27, Tile.GateGarrison); // the town door
  for (let y = 6; y <= 26; y++) b.set(98, y, Tile.WallGarrison);
  b.set(98, 4, Tile.WallGarrison); // the west wall's foot, in the shallows
  // THE ANSWERING BEACON — the standing reply to Hartfell's fellwatch:
  // when their fire burns, Pinewatch bars the Wardline and lights this.
  b.raise(119, 8, 6, 4, 1);
  b.fillRect(119, 8, 6, 4, Tile.StoneFloor); // a laid platform, not bare earth
  b.stairs(121, 11);
  b.stairs(122, 11);
  b.set(120, 9, Tile.Brazier).set(123, 9, Tile.Brazier);
  b.set(122, 9, Tile.BannerPole); // top row with the fires — the floor stays walkable
  // The fort cleared its sightlines: no tree stands within bowshot of
  // the north wall, and the stumps say it was done on purpose.
  for (let y = 0; y <= 4; y++) {
    for (let x = 99; x <= 116; x++) {
      const t = b.get(x, y);
      if (t === Tile.TreePine || t === Tile.TreeYew) {
        b.set(x, y, pineRng(x * 5, y * 3) < 0.2 ? Tile.Stump : Tile.Grass);
      }
    }
  }
  // The Hartgate's fires, cut into the notch rock.
  b.set(120, 3, Tile.Brazier).set(124, 3, Tile.Brazier);
  b.sign(118, 7, 'THE HARTGATE', [
    'the drove road: Hartfell, two days',
    'when the fell beacon burns, this gate bars',
    'stay on the road. the north means it',
  ], Tile.Signpost);

  // THE FORT'S ROOMS — a garrison is a machine for staying awake.
  // The Crown flies its weld at the gate; the town's charcoal stays
  // on the town's own walls. Everyone reads the difference daily.
  b.setDetail(120, 5, wallBannerDetail(3)).setDetail(124, 5, wallBannerDetail(3));
  // The drill yard, center of the parade ground: two butts, the spear
  // rack, and the rack the serjeant counts before he counts the men.
  b.set(110, 8, Tile.TargetDummy).set(114, 8, Tile.TargetDummy);
  b.set(117, 12, Tile.SpearRack).set(108, 12, Tile.WeaponRack);
  b.setDetail(112, 10, Detail.Pebbles).setDetail(110, 12, Detail.Sawdust);
  // The kennels, north-west corner: the hound line bred down from
  // Bern's dog — the one that came back across the ice. Rail-penned,
  // never chained.
  b.set(99, 7, Tile.RailWood).set(100, 7, Tile.RailWood).set(101, 7, Tile.RailWood).set(102, 7, Tile.RailWood);
  for (let y = 8; y <= 11; y++) b.set(103, y, Tile.RailWood);
  b.set(99, 12, Tile.RailWood).set(100, 12, Tile.RailWood); // gap at (101-102,12): the keeper's door
  b.set(100, 9, Tile.BeastPen);
  b.setDetail(101, 9, Detail.Straw).setDetail(100, 11, Detail.Straw).setDetail(102, 10, Detail.Straw);
  // The barracks: four bunks for eight sleepers — the hot-bunk law,
  // day watch by night and night watch by day. The hearth burns on
  // the same clock as the Pine and Bell's, for the same reason.
  b.building(99, 15, 11, 11, {
    wall: Tile.WallWood, floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 5 }],
    windows: [{ side: 'w', at: 5 }, { side: 's', at: 3 }, { side: 's', at: 7 }],
  });
  b.set(101, 17, Tile.Bed).set(101, 18, Tile.Bed);
  b.set(103, 17, Tile.Bed).set(103, 18, Tile.Bed);
  b.set(105, 17, Tile.Bed).set(105, 18, Tile.Bed);
  b.set(107, 17, Tile.Bed).set(107, 18, Tile.Bed);
  b.set(100, 23, Tile.Hearth);
  b.set(103, 22, Tile.Table).set(104, 22, Tile.Table);
  b.set(103, 23, Tile.Chair).set(105, 22, Tile.Chair);
  b.set(108, 21, Tile.WeaponRack).set(108, 23, Tile.Cabinet);
  b.setDetail(104, 16, Detail.Doormat).setDetail(104, 20, Detail.Rug).setDetail(105, 20, Detail.Rug);
  // The armory and the quartermaster's counter, west room; the
  // captain's quarters, east room — where the letters to Hoargate
  // get written and the answers get filed under nothing-yet.
  b.building(113, 15, 13, 9, {
    wall: Tile.WallStone, floor: Tile.StoneFloor,
    doors: [{ side: 'w', at: 4 }],
    windows: [{ side: 'n', at: 3 }, { side: 'n', at: 9 }, { side: 's', at: 6 }],
  });
  for (let y = 16; y <= 22; y++) b.set(120, y, Tile.WallStone);
  b.set(120, 19, Tile.DoorwayStone);
  b.set(115, 17, Tile.Counter).set(116, 17, Tile.Counter); // the requisition window
  b.set(114, 16, Tile.WeaponRack).set(118, 16, Tile.WeaponRack);
  b.set(114, 21, Tile.Crate).set(115, 21, Tile.CrateGoods).set(118, 22, Tile.Barrel);
  b.set(119, 16, Tile.Cabinet);
  b.set(119, 20, Tile.Bed).set(119, 21, Tile.Bed); // the quartermaster sleeps beside the ledger
  b.setDetail(114, 19, Detail.Doormat);
  b.set(124, 16, Tile.Bed).set(124, 17, Tile.Bed); // the captain sleeps where the maps are
  b.set(121, 16, Tile.Lectern); // the correspondence: Hoargate, the Charterhouse, Hartfell
  b.set(122, 20, Tile.Table).set(122, 21, Tile.Chair);
  b.set(124, 21, Tile.Cabinet);
  b.setDetail(122, 17, Detail.Rug).setDetail(123, 17, Detail.Rug);
  // The fort's lamps and the yard stores.
  b.set(107, 6, Tile.LampPost).set(119, 13, Tile.LampPost);
  b.set(124, 24, Tile.Crate).set(123, 25, Tile.Barrel).set(100, 13, Tile.Barrel);
  b.sign(104, 29, 'THE NORTHGUARD', [
    'the Crown holds the pass',
    'the town holds the Crown to it',
  ], Tile.HangingSign);

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
      if (Math.abs(x - 32) <= 4 && y >= 134) continue; // the Timber Gate's cut breathes
      if (Math.abs(x - 122) <= 4 && y <= 8) continue; // the Hartgate's notch breathes
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
  b.portal(14, 43, Tile.PortalDown, { x: 217.5, y: 594.5 }, UNDERWORLD_PLANE_ID); // the Pinewatch alcove
  b.set(16, 42, Tile.Crate).set(13, 45, Tile.Rock);
  b.setDetail(15, 44, Detail.Pebbles).setDetail(13, 43, Detail.Tuft);

  // ---------------------------------------------------------------
  // THE DRESSING — the shelves seated by fiction (the Dawnmead and
  // Amberford laws: every prop EARNED, upgrade before add, south and
  // east and west aprons only, clear air between pieces, and
  // restraint as binding as the additions). No fountain, no founder
  // statue, no guardian pair: nobody founds a watch, and the tower is
  // the only guardian this town has ever needed.
  // ---------------------------------------------------------------
  // The muster yard: the rota goes legible, the bell goes real.
  b.set(60, 51, Tile.NoticeBoard); // the board the sign has always meant
  b.set(69, 44, Tile.TownBell); // "the bell is not decoration" — now there is a bell
  b.set(68, 54, Tile.Woodpile); // the yard fire's cord, never allowed low
  // The Old Watch keeps a light on the watch book.
  b.set(65, 37, Tile.CandleStand);
  // The axe-smith: the working wall completed — lungs, stock, stone.
  b.set(47, 35, Tile.SmithBellows);
  b.set(52, 36, Tile.IngotRack);
  b.set(46, 41, Tile.Grindstone); // teeth set here, and only here
  // The stores: Nial's two-of-everything made visible.
  b.set(42, 68, Tile.ShopShelf);
  b.set(46, 68, Tile.DisplayTable);
  b.set(44, 67, Tile.HangingScale);
  b.set(50, 67, Tile.GlazedJars); // Maren's salve, jarred and glazed
  b.set(43, 72, Tile.BasketStack);
  // The Charterhouse: two ledgers, one roof, and light that behaves.
  b.set(87, 35, Tile.ScribesDesk); // the Crown's correspondence
  b.set(86, 43, Tile.ScribesDesk); // the Charter's hand, taught at the ford
  b.set(89, 35, Tile.CandleRack);
  // The wain bays weigh what they claim to weigh.
  b.set(92, 55, Tile.HangingScale);
  b.set(98, 55, Tile.GrainSacks);
  // The Pine and Bell earns its warm room.
  b.set(79, 71, Tile.GameTable);
  b.set(78, 71, Tile.WoodStool).set(80, 71, Tile.WoodStool);
  b.set(75, 67, Tile.SettleBench); // the four o'clock seat, nearest the fire
  b.set(82, 72, Tile.CloakStand); // wet coats stop at the door
  b.set(88, 68, Tile.BreadOven);
  b.set(85, 78, Tile.Woodpile);
  b.set(77, 76, Tile.HitchingPost);
  // The waterfront: posts for the rafts, a slab for the catch, and
  // Ylva's punt drawn up where the water can watch it.
  b.set(49, 26, Tile.MooringPost).set(62, 26, Tile.MooringPost);
  b.set(87, 15, Tile.FishmongerSlab);
  b.set(91, 16, Tile.BasketStack);
  b.set(84, 10, Tile.BeachedSkiff);
  // The Winter Strand: the ice tools wait all summer, on purpose.
  b.set(8, 120, Tile.ToolRack); // the ice saws
  b.set(6, 116, Tile.BeachedSkiff);
  b.set(5, 110, Tile.MooringPost);
  // The pitch yard: fire discipline as furniture.
  b.set(98, 84, Tile.BroomAndPail);
  b.set(100, 82, Tile.HandCart);
  // The board yard's cart, loading at first light.
  b.set(33, 60, Tile.HandCart);
  // The nursery's public face: the ONE hedge in town, because the
  // nursery is the one place in Pinewatch that owns shears.
  for (const hx of [78, 79, 80, 82, 83, 84]) b.set(hx, 27, Tile.Hedge);
  b.set(81, 27, Tile.HedgeGate);
  b.set(78, 28, Tile.Hedge); // the ring opens at the barrow walk, and at Ospren's constitutional
  b.set(86, 20, Tile.Wheelbarrow); // on the barrow walk, where else
  b.set(79, 26, Tile.LeanLadder); // clear of the shingle at (83,26)
  // The Northguard's working corners.
  b.set(114, 20, Tile.IngotRack); // Torger's iron, counted twice
  b.set(117, 22, Tile.GrainSacks);
  b.set(99, 13, Tile.WaterTrough); // the kennel trough
  b.set(100, 14, Tile.Woodpile);
  // (A second spear rack and a crate stack at the gate died in the
  // dressing review: with the beacon's cliffs they sealed the gate
  // pocket whole. Restraint is a placement.)
  // The ore cut: the charcoal argument, made visible.
  b.set(40, 111, Tile.Wheelbarrow);
  b.set(44, 111, Tile.Woodpile); // mill scrap and storm fall, per the licence
  // The drove yard drinks; the lane hitches.
  b.set(26, 131, Tile.WaterTrough);
  b.set(30, 125, Tile.HitchingPost);
  // The Waykeepers hold this road, and say so at the mouth.
  b.set(27, 146, Tile.WayShrine);
  // THE CORDWOOD MOTIF — "a cord a roof, before the first frost,"
  // made visible at every roof that owes one. Wood is not set
  // dressing in this town. Wood is the town.
  b.set(11, 73, Tile.Woodpile).set(22, 73, Tile.Woodpile);
  b.set(32, 73, Tile.Woodpile).set(57, 73, Tile.Woodpile);
  b.set(87, 105, Tile.Woodpile).set(97, 105, Tile.Woodpile);
  b.set(75, 105, Tile.Woodpile); // clear air from the physic sign

  // THE PEOPLE — thirty-seven lives on the saw's clock, the rota's,
  // and now the Crown's.
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
  // The Waykeeper moved with her road: she keeps the Timber Gate's
  // cut now, the last lamp of the long way in.
  b.actor('warden_sigrun', 32.5, 136.5, Math.PI / 2, 'pine_warden');
  b.actor('fisher_ylva', 88.5, 12.5, -Math.PI / 2, 'pine_fisher');
  b.actor('pinewatch_watch', 66.5, 43.5, Math.PI / 2, 'pine_watch');
  // THE SADDLE IN THE SCHEDULE: the mountain Waykeeper rides the
  // Watch Road on a garron, yard to the Timber Road gate and back.
  b.actor('outrider_haldis', 65.5, 58.5, -Math.PI / 2, 'pine_outrider');
  b.actor('pinewatch_watch', 60.5, 111.5, Math.PI / 2, 'pine_watch');
  b.actor('pinewatch_watch', 104.5, 60.5, Math.PI / 2, 'pine_watch');
  // THE NORTHGUARD — the Crown's souls, on the Crown's clock.
  b.actor('captain_stellan', 122.5, 18.5, -Math.PI / 2, 'pine_captain');
  b.actor('quartermaster_berget', 115.5, 16.5, Math.PI / 2, 'pine_quartermaster');
  b.actor('serjeant_ove', 112.5, 10.5, -Math.PI / 2, 'pine_serjeant');
  b.actor('houndmistress_ranka', 101.5, 10.5, Math.PI / 2, 'pine_houndmistress');
  b.actor('pinewatch_northguard', 122.5, 6.5, -Math.PI / 2, 'pine_northguard_day');
  b.actor('pinewatch_northguard', 120.5, 6.5, -Math.PI / 2, 'pine_northguard_night');
  b.actor('pinewatch_northguard', 110.5, 14.5, -Math.PI / 2, 'pine_northguard_patrol_day');
  b.actor('pinewatch_northguard', 114.5, 14.5, -Math.PI / 2, 'pine_northguard_patrol_night');
  // THE SOUTHREACH — the grown quarter's keepers.
  b.actor('hunter_kolbrun', 15.5, 107.5, Math.PI / 2, 'pine_hunter_master');
  b.actor('fletcher_espen', 28.5, 102.5, Math.PI, 'pine_fletcher');
  b.actor('herbalist_maren', 71.5, 101.5, Math.PI / 2, 'pine_herbalist');
  b.actor('ironmaster_torger', 42.5, 108.5, Math.PI, 'pine_ironmaster');
  b.actor('drover_sylvi', 26.5, 126.5, Math.PI / 2, 'pine_drover');
  b.actor('pinewatch_hunter', 18.5, 106.5, Math.PI / 2, 'pine_hunter');
  b.actor('pinewatch_hunter', 21.5, 113.5, -Math.PI / 2, 'pine_hunter');
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
