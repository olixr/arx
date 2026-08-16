import {
  Detail,
  Tile,
  awningTile,
  bannerPoleTile,
  bracketSignDetail,
  pennantDetail,
  wallBannerDetail,
} from '@arx/shared';
import { HARTFELL_RECT } from '../geography.js';
import { UNDERWORLD_PLANE_ID } from '../planes.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Hartfell — the town past the treeline, between two waters on the
 * open fell. Level 25-35 country: the haven's relief grades the
 * walk-out (tier 3 at the walls, 4 a stone's throw on) and everything
 * past the near fell is honestly tier 5.
 *
 * THE TOWN EXISTS BECAUSE OF ONE ACCIDENT OF THE EARTH: the Kettle, a
 * spring-fed tarn that steams in every month and has never once
 * frozen. The hart herds wintered beside it before anyone owned them;
 * the herders came for the harts, the hunters for the herders' fires,
 * and nothing else about this place has ever invited anyone. Snow
 * owns every corner of Hartfell except the melt ring — a circle of
 * bare green around the warm water, visible from the south gate,
 * which is the whole town in one image.
 *
 * THE TITHE. Where Pinewatch is a town AGAINST the wild, Hartfell is
 * a town INSIDE it. The fell cannot be held, so the town never tried:
 * it keeps herds the wolves could take and pays the tithe instead —
 * every slaughter-day the offal and the old beasts go out on the
 * sledge to the Quiet Stones, and the packs take the tithe and leave
 * the folds alone. Forty years and the bargain has never broken.
 * Pinewatch thinks this is madness. Hartfell thinks a wall you must
 * man nightly is a debt, and a bargain both sides keep is a wall that
 * mans itself. That argument is the whole axis of the north.
 *
 * THE TRADE. Furs, hides, horn, smoked meat, and tallow. Every winter
 * cloak in Silverfall began as a Hartfell hide; every road lamp south
 * of the Glasswater burns Hartfell tallow; the Lantern Row carves
 * Hartfell antler. The town buys what it cannot make — Pinewatch
 * boards, Silverfall iron, Amberford grain — and it cannot make much:
 * no sawmill, no great forge, no crops, no chapel, no castle. The
 * bank is a strongroom with two chests and a woman who counts.
 *
 * THE TOWN-PLAN LAW (Amberford's, kept whole): streets first — the
 * Hartway Street runs gate to Fell Row, the Market Walk crosses it,
 * the Kettle Walk rings the warm water — every building fronts one,
 * with >= 3 open tiles between structures. A DIAGONAL BUDGET OF TWO:
 * the Springhall's lakeward shoulders, nothing else, because
 * everything else here was built by cold hands in a hurry. ROOM
 * INTENT: one job per room, furniture proves it. Stone and turf, not
 * board and shingle — this is NOT Pinewatch with the names changed:
 * low buildings, thick walls, small windows, board rain-roofs only
 * where work needs dry hands.
 *
 * THE WATERS. West: the Graywater's cold arm — dry strand in the
 * middle rows, the north lobe lapping the top corner, and the bay
 * swallowing the south-west; the wall dies into it at both ends (the
 * harbor-mole law). North-east: the Darkwater, which no boat has ever
 * crossed. Centre-east: the Kettle. The Warm Run — the Kettle's
 * overflow — snakes west through town and spends itself in the
 * beasts' pool beside the folds, so the herds drink warm water all
 * winter. The run never pierces the curtain (the Pinewatch tailrace
 * law).
 *
 * Anchors that must NOT move (the people pass hangs routines off
 * them): every door, every bed, the Kettle rim, the rota of gates
 * (south gate, herdgate, shoregate, the Tithegate notch), the Quiet
 * Stones, the sledge, the beacon, both piers. The Hartway lands at
 * world (838,-345) = local (54,95); the Cairn Path leaves at world
 * (810,-440) = local (26,0).
 *
 * THE PEOPLE (cast by the people pass; every room kept its promised
 * name): Speaker Ashild (the stone house on the street), Maeva the
 * springkeeper (the Springhall's east room), Kolgrim the huntmaster +
 * Sunn the fell guide (Horn Hall), Ranna the furrier + Inga the
 * tallywife (the Hidehall's back rooms), Ulfa the chandler (the
 * chandlery), Geir the smokemaster (the rendery), Tuli the
 * bone-carver (the east cottage of the Warm Row), Eirik the smith
 * (the smithy cot), Brandulf + the buyer Hallward (the Horn and
 * Hearth), Grimm the pedlar (the pitch by the inn), Swein the
 * herdmaster + two herders (the fold bothy), Orvar the tithekeeper
 * (the hut by the sledge), Elder Gunvor (the cottage on the strand,
 * facing the ice), Eyvor the netkeeper (the quay hut), Signe the
 * Waykeeper (the gate post), and the Fellwatch (the wardhut and the
 * beacon hut).
 */
export function buildHartfell(): ZoneDef {
  const R = HARTFELL_RECT;
  const b = new ZoneBuilder('hartfell', 'Hartfell', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE WATERS FIRST — the lakes decide everything else.
  // ---------------------------------------------------------------
  // The Graywater's west edge. Three moods down one border: the north
  // lobe's hem in the top corner, dry strand through the middle rows,
  // and the bay drowning the south-west. The wobble keeps every ruler
  // off every waterline.
  for (let y = 0; y < R.h; y++) {
    let w = -1; // columns west of this are water
    if (y <= 14) w = 4 - Math.floor(y / 5); // the north lobe hem
    if (y >= 58) w = Math.min(36, Math.floor((y - 58) * 0.9)); // the bay
    if (w < 0) continue;
    const wob = Math.round(Math.sin(y * 0.7) * 1.2);
    const edge = Math.max(0, w + wob);
    for (let x = 0; x <= edge && x < R.w; x++) {
      b.set(x, y, x <= edge - 3 ? Tile.Water : Tile.WaterShallow);
    }
    if (edge + 1 < R.w && y >= 58) b.set(edge + 1, y, Tile.Sand);
  }
  // The bay's marsh fringe, outside the walls, where the midden goes.
  b.set(24, 90, Tile.Swamp).set(28, 91, Tile.Swamp).set(33, 93, Tile.Swamp);
  b.set(30, 90, Tile.FibrePlant).set(36, 94, Tile.Swamp).set(38, 93, Tile.FibrePlant);
  // The strand: sand between the middle rows' meadow and the water.
  for (let y = 15; y <= 57; y++) {
    const s = 1 + Math.round(Math.sin(y * 0.5));
    for (let x = 0; x <= s; x++) {
      if (b.get(x, y) === Tile.Grass) b.set(x, y, Tile.Sand);
    }
  }

  // THE DARKWATER — the north-east corner. No boat has ever crossed
  // it; the shoreline runs a long diagonal out of the rect so the
  // wild lake beyond the border owns the horizon.
  for (let y = 0; y <= 38; y++) {
    const shore = 102 + Math.floor(y * 0.72) + Math.round(Math.sin(y * 0.9) * 1.5);
    for (let x = shore; x < R.w; x++) {
      b.set(x, y, x >= shore + 3 ? Tile.Water : Tile.WaterShallow);
    }
    if (shore - 1 >= 0 && shore - 1 < R.w) b.set(shore - 1, y, Tile.Sand);
  }
  b.set(112, 26, Tile.Swamp).set(118, 30, Tile.Swamp).set(108, 18, Tile.FibrePlant);
  b.set(120, 34, Tile.Swamp).set(115, 22, Tile.FibrePlant);

  // ---------------------------------------------------------------
  // THE CRAG SHELF — the fell closes the town's north side. Two
  // level-1 shelves with the Tithegate notch between them: shelf A is
  // the Lookout, shelf B carries the Beacon. Their auto-fenced cliffs
  // ARE the north wall; the notch is the only way through, and the
  // sledge goes through it every slaughter-day.
  // ---------------------------------------------------------------
  b.raise(8, 8, 15, 9, 1); // shelf A: lx 8-22
  b.raise(30, 8, 69, 9, 1); // shelf B: lx 30-98
  b.stairs(13, 16).stairs(14, 16).stairs(15, 16);
  b.stairs(37, 16).stairs(38, 16).stairs(39, 16);

  // ---------------------------------------------------------------
  // THE STREETS — laid before anything was allowed to stand on them.
  // ---------------------------------------------------------------
  b.path({ x: 54, y: 33 }, { x: 54, y: 88 }, 3); // the Hartway Street: Fell Row -> south gate
  b.path({ x: 22, y: 63 }, { x: 98, y: 63 }, 2); // the Market Walk: folds -> rendery
  b.path({ x: 32, y: 33 }, { x: 72, y: 33 }, 2); // the Fell Row, under the crag
  b.fillRect(53, 89, 3, 7, Tile.Path); // the south mouth meets the Hartway
  b.fillRect(25, 0, 2, 19, Tile.Dirt); // the Cairn Path through the Tithegate notch
  b.path({ x: 26, y: 18 }, { x: 33, y: 32 }, 2, Tile.Dirt); // notch down to Fell Row
  b.fillRect(17, 20, 2, 60, Tile.Dirt); // the Shore Lane, outside the west wall
  b.fillRect(101, 63, 12, 1, Tile.Dirt); // the drove track out the herdgate

  // ---------------------------------------------------------------
  // THE KETTLE — the warm water, the town's centre, clock, and
  // reason. Stone walk around it, bathing shallows, a deep heart
  // that steams in every month. The melt ring around it is dressed
  // last: everywhere else in Hartfell the snow wins.
  // ---------------------------------------------------------------
  b.fillEllipse(84, 44, 9, 7, Tile.StoneFloor); // the Kettle Walk
  b.fillEllipse(84, 44, 7, 5, Tile.WaterShallow); // the bathing shallows
  b.fillEllipse(84, 44, 4, 2.6, Tile.Water); // the deep heart
  b.set(75, 41, Tile.Bench).set(93, 41, Tile.Bench).set(84, 51, Tile.Bench);
  b.set(76, 39, Tile.LampPost).set(92, 39, Tile.LampPost);
  b.set(77, 50, Tile.LampPost).set(91, 50, Tile.LampPost);
  b.set(79, 51, Tile.Basin).set(80, 51, Tile.Basin); // the washing stones
  b.sign(90, 51, 'THE KETTLE', [
    'it has never frozen',
    'the old folk say it never will',
    'mind the children near the deep',
  ], Tile.Signpost);

  // THE WARM RUN — the Kettle's overflow, west through town to the
  // beasts' pool. It keeps its banks green all winter and it crosses
  // the Hartway Street under three plank boards. It does NOT pierce
  // the curtain: it spends itself in the pool the herds drink from.
  const RUN: Array<[number, number]> = [
    [76, 47], [75, 47], [74, 48], [73, 48], [72, 49], [71, 49], [70, 49],
    [69, 50], [68, 50], [67, 50], [66, 51], [65, 51], [64, 51], [63, 51],
    [62, 52], [61, 52], [60, 52], [59, 52], [58, 53], [57, 53], [56, 53],
    [55, 53], [54, 53], [53, 53], [52, 53], [51, 54], [50, 54], [49, 54],
    [48, 54], [47, 54], [46, 55], [45, 55], [44, 55], [43, 55], [42, 55],
    [41, 56], [40, 56], [39, 56], [38, 56], [37, 56], [36, 56], [35, 57],
    [34, 57], [33, 57], [32, 57], [31, 57], [30, 58], [29, 58],
  ];
  for (const [x, y] of RUN) b.set(x, y, Tile.WaterShallow);
  b.set(53, 53, Tile.Bridge).set(54, 53, Tile.Bridge).set(55, 53, Tile.Bridge);
  b.fillEllipse(26, 59, 3, 2, Tile.WaterShallow); // the beasts' pool

  // ---------------------------------------------------------------
  // THE CURTAIN — dry stone on three sides, the crag closing the
  // north, and both ends standing in the Graywater's bay (the
  // harbor-mole law). Four ways in: the south gate (the Hartway), the
  // herdgate east, the shoregate west, and the Tithegate notch.
  // ---------------------------------------------------------------
  // West wall, shelf A's cliff to the bay.
  for (let y = 17; y <= 86; y++) b.set(20, y, Tile.WallGarrison);
  b.set(20, 49, Tile.GateGarrison).set(20, 50, Tile.GateGarrison).set(20, 51, Tile.GateGarrison);
  // South curtain with the Hartway gate; its west end stands in the marsh.
  for (let x = 30; x <= 100; x++) b.set(x, 88, Tile.WallGarrison);
  b.set(53, 88, Tile.GateGarrison).set(54, 88, Tile.GateGarrison).set(55, 88, Tile.GateGarrison);
  // The bay seals the south-west gap between the two wall ends: cold
  // deep water, not a wading route. Nobody swims to Hartfell.
  for (let y = 86; y <= 88; y++) {
    for (let x = 21; x <= 29; x++) b.set(x, y, Tile.Water);
  }
  b.set(21, 85, Tile.WaterShallow).set(26, 85, Tile.WaterShallow).set(29, 85, Tile.WaterShallow);
  // East curtain, tied to shelf B's cliff corner, with the herdgate.
  b.set(99, 8, Tile.WallGarrison);
  for (let y = 8; y <= 87; y++) b.set(100, y, Tile.WallGarrison);
  b.set(100, 62, Tile.GateGarrison).set(100, 63, Tile.GateGarrison).set(100, 64, Tile.GateGarrison);
  // The Tithegate: a barred wall across the notch between the shelves.
  b.set(23, 12, Tile.WallGarrison).set(27, 12, Tile.WallGarrison);
  b.set(28, 12, Tile.WallGarrison).set(29, 12, Tile.WallGarrison);
  b.set(24, 12, Tile.GateGarrison).set(25, 12, Tile.GateGarrison).set(26, 12, Tile.GateGarrison);
  // Gate fires: every gate in the north burns tallow all night.
  b.set(51, 90, Tile.Brazier).set(57, 90, Tile.Brazier); // south gate, outside
  b.set(23, 15, Tile.Brazier).set(29, 15, Tile.Brazier); // the Tithegate, inside
  b.set(101, 60, Tile.Brazier).set(101, 66, Tile.Brazier); // herdgate, outside
  b.set(18, 48, Tile.Brazier); // shoregate, on the lane
  // The gate cheeks wear the watch's charcoal; the town flies madder.
  b.setDetail(52, 88, wallBannerDetail(7)).setDetail(56, 88, wallBannerDetail(7));
  b.sign(50, 87, 'HARTFELL', [
    'the fold is warm and the fell is not',
    'bar the gates at the horn',
  ], Tile.Signpost);
  b.sign(103, 65, 'THE DROVE', [
    'herds out at thaw, home at horn',
    'count them out, count them in',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE QUIET STONES — outside the Tithegate, on the open fell strip
  // above the shelves. A ring of standing stones older than any road,
  // the sledge-flat stone in the middle, and the Cairn Path running
  // straight through the ring, because the ring was always a door.
  // The tithe is left on the flat stone. You do not wait to watch.
  // ---------------------------------------------------------------
  b.set(23, 2, Tile.PillarStone).set(28, 1, Tile.PillarStone).set(31, 3, Tile.PillarStone);
  b.set(21, 5, Tile.PillarStone).set(31, 6, Tile.PillarStone);
  b.set(23, 7, Tile.PillarStone).set(29, 7, Tile.PillarStone);
  b.set(25, 4, Tile.StoneFloor).set(26, 4, Tile.StoneFloor); // the flat stone
  b.set(25, 5, Tile.StoneFloor).set(26, 5, Tile.StoneFloor);
  b.set(24, 6, Tile.BonePile).set(30, 4, Tile.BonePile);
  b.set(34, 4, Tile.TreeYew); // the tithe yew, the one tree the fell kept
  b.sign(30, 7, 'THE QUIET STONES', [
    'leave the tithe on the flat stone',
    'do not wait to watch',
    'walk back without hurrying',
  ], Tile.Signpost);
  // The old boundary: lone stones marching east along the strip, the
  // row the barrow folk set before the town had a name to argue with.
  b.set(44, 3, Tile.PillarStone).set(62, 5, Tile.PillarStone).set(80, 2, Tile.PillarStone);
  b.set(94, 4, Tile.PillarStone);

  // ---------------------------------------------------------------
  // THE BEACON — shelf B's west end. A stone platform, three fire
  // baskets, the horn on its rack, and the hut where the watch
  // sleeps cold. When the beacon burns, Pinewatch bars the Wardline
  // gate: the two towns answer each other across the water.
  // ---------------------------------------------------------------
  b.fillRect(33, 10, 11, 5, Tile.StoneFloor);
  b.set(35, 11, Tile.Brazier).set(38, 10, Tile.Brazier).set(41, 12, Tile.Brazier);
  b.set(34, 13, Tile.WeaponRack); // the horn
  b.set(33, 9, bannerPoleTile(1)).set(43, 9, bannerPoleTile(1)); // madder, the town's color
  // The watch hut: two bunks, a stove, and the driest wood in town.
  b.fillRect(46, 9, 6, 6, Tile.WoodFloor);
  b.outlineRect(46, 9, 6, 6, Tile.WallWood);
  b.set(46, 11, Tile.DoorwayWood); // door west, onto the platform
  b.set(49, 9, Tile.WallWoodWindow);
  b.set(47, 10, Tile.Bed).set(48, 10, Tile.Bed);
  b.set(50, 10, Tile.Hearth);
  b.set(50, 13, Tile.Crate).set(47, 13, Tile.Barrel);
  b.setDetail(47, 12, Detail.Rug);
  b.setDetail(48, 14, wallBannerDetail(1));
  b.sign(41, 17, 'THE BEACON', [
    'dry wood and a long view',
    'if it burns, Pinewatch bars its gates',
  ], Tile.Signpost);
  // Shelf B east of the beacon: bare crag garden — snow, stone, wind.
  b.set(58, 11, Tile.Rock).set(70, 13, Tile.Rock).set(82, 10, Tile.Rock).set(93, 12, Tile.Rock);
  b.set(63, 13, Tile.TreePine).set(76, 10, Tile.TreePine).set(90, 14, Tile.TreePine);
  b.set(68, 11, Tile.Bench); // somebody carries a cold pipe up here
  // Shelf A: the Lookout. A bench, a fire, and the whole gray west.
  b.set(12, 12, Tile.Bench).set(16, 10, Tile.Bench);
  b.set(14, 11, Tile.Brazier);
  b.set(10, 9, Tile.Rock).set(19, 14, Tile.Rock).set(9, 15, Tile.TreePine);

  // ---------------------------------------------------------------
  // THE TITHE YARD — inside the Tithegate, under the crag. The
  // sledge, the cold store, and Orvar's hut. The tithekeeper walks
  // the sledge out alone every slaughter-day, and the town's respect
  // for him is the kind you give a man whose job you will not take.
  // ---------------------------------------------------------------
  b.fillRect(22, 18, 14, 16, Tile.Dirt);
  // Orvar's hut: one room, one bed, a chair facing the door, and the
  // tithe ledger nobody else has ever opened.
  b.fillRect(24, 19, 6, 6, Tile.WoodFloor);
  b.outlineRect(24, 19, 6, 6, Tile.WallWood);
  b.set(29, 21, Tile.DoorwayWood); // door east, onto the yard
  b.set(26, 19, Tile.WallWoodWindow);
  b.set(25, 20, Tile.Bed).set(25, 21, Tile.Bed);
  b.set(25, 23, Tile.Lectern); // the tithe ledger
  b.set(28, 23, Tile.Chair);
  b.setDetail(28, 21, Detail.Doormat);
  // The cold store: stone, windowless, meat racked high.
  b.fillRect(24, 28, 6, 6, Tile.StoneFloor);
  b.outlineRect(24, 28, 6, 6, Tile.WallStone);
  b.set(29, 30, Tile.DoorwayStone); // door east, at the sledge
  b.set(25, 29, Tile.ToolRack).set(27, 29, Tile.ToolRack); // the hanging rails
  b.set(25, 32, Tile.Crate).set(28, 32, Tile.Barrel);
  // The sledge, loaded rails out, pointed at the gate.
  b.set(32, 26, Tile.RailWood).set(33, 26, Tile.RailWood).set(34, 26, Tile.RailWood);
  b.set(32, 24, Tile.Crate).set(34, 24, Tile.Barrel);
  b.setDetail(33, 27, Detail.Straw);
  b.sign(31, 22, 'THE TITHE YARD', [
    'slaughter day is sledge day',
    'the beasts know the smell, keep them penned',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // HORN HALL — the hunters' lodge on the Fell Row, under the
  // beacon. The long hall wears forty years of antler; the shop
  // corner sells bows, spears, and traps; the back room bunks the
  // young hunters, Sunn's by the window because she leaves at dawn.
  // Kolgrim the huntmaster keeps the hall and the law: the hunt owes
  // the fold first, and no bow is strung past the stones.
  // ---------------------------------------------------------------
  b.fillRect(36, 18, 17, 13, Tile.WoodFloor);
  b.outlineRect(36, 18, 17, 13, Tile.WallWood);
  b.set(43, 30, Tile.DoorwayWoodWide).set(44, 30, Tile.DoorwayWoodWide); // onto the Fell Row
  b.set(36, 24, Tile.WallWoodWindow).set(52, 22, Tile.WallWoodWindow);
  b.set(40, 18, Tile.WallWoodWindow).set(48, 18, Tile.WallWoodWindow);
  // The long hall: hearth west, the feast board, the trophy wall.
  b.set(37, 20, Tile.Hearth);
  b.set(39, 22, Tile.Table).set(40, 22, Tile.Table).set(41, 22, Tile.Table).set(42, 22, Tile.Table);
  b.set(39, 21, Tile.Chair).set(41, 21, Tile.Chair).set(40, 23, Tile.Chair).set(42, 23, Tile.Chair);
  b.set(38, 19, Tile.WeaponRack).set(41, 19, Tile.WeaponRack).set(44, 19, Tile.WeaponRack); // the antler wall
  b.setDetail(39, 25, Detail.Rug).setDetail(40, 25, Detail.Rug);
  // The shop corner: the counter faces the door; the racks behind it
  // hold the trade — bows, spears, snares, and the wolf-iron traps.
  b.set(47, 24, Tile.Counter).set(48, 24, Tile.Counter);
  b.set(49, 20, Tile.ToolRack).set(51, 24, Tile.ToolRack);
  b.set(50, 27, Tile.Crate).set(37, 28, Tile.Barrel);
  // The bunk room, partitioned east: Kolgrim's cot and the young
  // hunters' bunks. Sunn's is the one by the window.
  for (let x = 45; x <= 52; x++) if (x !== 47) b.set(x, 26, Tile.WallWood);
  b.set(47, 26, Tile.DoorwayWood);
  b.set(46, 28, Tile.Bed).set(49, 28, Tile.Bed).set(51, 28, Tile.Bed);
  b.set(52, 27, Tile.WallWoodWindow);
  b.setDetail(43, 29, Detail.Doormat).setDetail(44, 29, Detail.Doormat);
  b.set(41, 31, awningTile('board', 0)).set(42, 31, awningTile('board', 0));
  b.sign(46, 31, 'HORN HALL', [
    'the hunt owes the fold first',
    'no bow strung past the stones',
  ], Tile.HangingSign);

  // THE BUTTS — the practice ground east of the street, below the
  // crag: straw marks, a firing lane, and Sunn at dawn.
  b.fillRect(60, 20, 12, 3, Tile.Dirt);
  b.set(71, 20, Tile.Fence).set(71, 22, Tile.Fence);
  b.setDetail(71, 21, Detail.Straw).setDetail(69, 21, Detail.Straw);
  b.set(59, 21, Tile.Fence);
  b.sign(60, 24, 'THE BUTTS', [
    'loose only east',
    'Sunn shoots at dawn, stand behind her',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE SPRINGHALL — moot-house and bath-house on the Kettle's north
  // rim, and the only dressed stone in town. Hartfell answers to no
  // crown: it answers to a circle of benches with a lectern that any
  // roof may stand at. The east wing is the warm pool; Maeva the
  // springkeeper keeps it, and her remedies, and what the water
  // knows. The two lakeward shoulders are the town's whole diagonal
  // budget, spent where the stone earns it.
  // ---------------------------------------------------------------
  b.fillRect(74, 22, 23, 13, Tile.StoneFloor);
  b.outlineRect(74, 22, 23, 13, Tile.WallStone);
  b.set(74, 34, Tile.WallStoneDiagNE).set(96, 34, Tile.WallStoneDiagNW);
  b.set(84, 34, Tile.DoorwayStoneWide).set(85, 34, Tile.DoorwayStoneWide);
  b.set(78, 34, Tile.WallStoneWindow).set(91, 34, Tile.WallStoneWindow);
  b.set(74, 28, Tile.WallStoneWindow).set(96, 27, Tile.WallStoneWindow);
  b.set(80, 22, Tile.WallStoneWindow).set(89, 22, Tile.WallStoneWindow);
  // The moot floor: the speaker's lectern, the bench ring, the fire.
  b.set(76, 24, Tile.Hearth);
  b.set(78, 26, Tile.Lectern);
  b.set(76, 28, Tile.Bench).set(78, 29, Tile.Bench).set(80, 29, Tile.Bench);
  b.set(82, 28, Tile.Bench).set(80, 26, Tile.Bench).set(82, 25, Tile.Bench);
  b.set(84, 26, Tile.Bench).set(84, 29, Tile.Bench);
  b.setDetail(79, 27, Detail.RugRound);
  b.setDetail(77, 23, Detail.Tapestry).setDetail(78, 23, Detail.Tapestry);
  // The bath wing, partitioned east: the warm pool, the basins, and
  // Maeva's room in the corner with the herb chest.
  for (let y = 23; y <= 33; y++) b.set(87, y, Tile.WallStone);
  b.set(87, 29, Tile.DoorwayStone);
  b.fillRect(90, 26, 4, 3, Tile.WaterShallow); // the warm pool
  b.set(89, 30, Tile.Basin).set(94, 30, Tile.Basin);
  b.setDetail(89, 25, Detail.Rug).setDetail(94, 25, Detail.Rug);
  for (let x = 88; x <= 93; x++) b.set(x, 31, Tile.WallStone);
  b.set(90, 31, Tile.DoorwayStone);
  b.set(88, 33, Tile.Bed).set(89, 33, Tile.Bed); // Maeva sleeps beside her water
  b.set(93, 33, Tile.Cabinet).set(95, 32, Tile.Cabinet); // the remedy chests
  b.setDetail(84, 33, Detail.Doormat).setDetail(85, 33, Detail.Doormat);
  // The forecourt: lamps, benches, and the moot bell... which is a
  // horn, because of course it is.
  b.set(82, 36, Tile.LampPost).set(88, 36, Tile.LampPost);
  b.set(80, 36, Tile.Bench).set(89, 36, Tile.Bench);
  b.set(79, 35, awningTile('bowed', 1)).set(80, 35, awningTile('bowed', 1));
  b.set(90, 35, awningTile('bowed', 1)).set(91, 35, awningTile('bowed', 1));
  b.setDetail(83, 34, wallBannerDetail(1)).setDetail(86, 34, wallBannerDetail(1));
  b.sign(87, 36, 'THE SPRINGHALL', [
    'moot at first frost and every quarter',
    'wash before the pool, not in it',
  ], Tile.HangingSign);

  // ---------------------------------------------------------------
  // THE SPEAKER'S HOUSE — stone, modest, facing the street the way a
  // speaker should: reachable. Ashild was chosen, not crowned, and
  // the house says so — one hall, one desk, one bed, and the moot
  // horn on the wall by the door.
  // ---------------------------------------------------------------
  b.fillRect(58, 38, 11, 11, Tile.StoneFloor);
  b.outlineRect(58, 38, 11, 11, Tile.WallStone);
  b.set(58, 43, Tile.DoorwayStone); // door west, onto the Hartway Street
  b.set(63, 38, Tile.WallStoneWindow).set(68, 41, Tile.WallStoneWindow).set(63, 48, Tile.WallStoneWindow);
  b.set(60, 39, Tile.Hearth);
  b.set(62, 41, Tile.Table).set(63, 41, Tile.Chair).set(61, 42, Tile.Chair);
  b.set(66, 39, Tile.Lectern); // the speaker's desk, and the town's book
  b.set(59, 41, Tile.WeaponRack); // the moot horn, by the door
  for (let x = 59; x <= 67; x++) if (x !== 62) b.set(x, 45, Tile.WallStone);
  b.set(62, 45, Tile.DoorwayStone);
  b.set(66, 47, Tile.Bed).set(67, 47, Tile.Bed);
  b.set(59, 47, Tile.Cabinet);
  b.setDetail(60, 43, Detail.Rug).setDetail(61, 43, Detail.Rug);
  b.setDetail(58, 44, Detail.Doormat);
  b.setDetail(59, 48, wallBannerDetail(1));

  // ---------------------------------------------------------------
  // THE WARM ROW — three cottages on the melt ring, doors north to
  // the water, because real houses cluster on real warmth. Alike as
  // siblings, different as siblings; the east one is Tuli's, half
  // home and half bone-shop, shavings to the door.
  // ---------------------------------------------------------------
  const cottage = (x: number, y: number, kind: 'trim' | 'worn'): void => {
    b.fillRect(x, y, 7, 7, Tile.WoodFloor);
    b.outlineRect(x, y, 7, 7, Tile.WallWood);
    b.set(x + 3, y, Tile.DoorwayWood); // door north, to the Kettle
    b.set(x, y + 3, Tile.WallWoodWindow).set(x + 6, y + 3, Tile.WallWoodWindow);
    b.set(x + 1, y + 5, Tile.Bed).set(x + 2, y + 5, Tile.Bed);
    b.set(x + 5, y + 1, Tile.Hearth);
    b.set(x + 4, y + 4, Tile.Table).set(x + 5, y + 4, Tile.Chair);
    b.setDetail(x + 3, y + 1, Detail.Doormat);
    if (kind === 'trim') {
      b.set(x + 1, y + 1, Tile.Cabinet);
      b.setDetail(x + 3, y + 3, Detail.RugRound);
    } else {
      b.set(x + 1, y + 2, Tile.Crate).set(x + 1, y + 1, Tile.Barrel);
    }
  };
  cottage(70, 54, 'worn'); // the herder Bryn's roof, when she is not at the bothy
  cottage(80, 55, 'trim'); // old Ferd and his wife, who bathe daily and say so
  // Tuli's: the bone-carver's cottage-shop, combs and hafts and
  // buttons, the carving bench under the window for the light.
  b.fillRect(90, 54, 7, 7, Tile.WoodFloor);
  b.outlineRect(90, 54, 7, 7, Tile.WallWood);
  b.set(93, 54, Tile.DoorwayWood);
  b.set(90, 57, Tile.WallWoodWindow).set(96, 57, Tile.WallWoodWindow);
  b.set(91, 57, Tile.CarvingBench); // under the west window
  b.set(91, 55, Tile.Counter).set(92, 55, Tile.Counter);
  b.set(95, 55, Tile.Crate); // antler in, by the crateful
  b.set(94, 59, Tile.Bed).set(95, 59, Tile.Bed);
  b.set(91, 59, Tile.Chair);
  b.setDetail(93, 55, Detail.Doormat);
  b.sign(95, 53, 'THE BONE SHOP', [
    'combs, hafts, buttons, charms',
    'knock soft, the work is small',
  ], Tile.HangingSign);
  b.setDetail(71, 60, Detail.WallBasket);
  b.set(78, 54, Tile.FlowerBox).set(88, 55, Tile.FlowerBox);
  b.setDetail(84, 61, pennantDetail(1));

  // ---------------------------------------------------------------
  // THE HIDEHALL — the fur exchange, and the reason the Hartway
  // exists. Grading counters, hide racks, the bale floor, and the
  // strongroom where Inga counts: a vault, two chests, and no window
  // for a reason. Ranna the furrier grades; you may argue with the
  // grade; you may not argue with Inga.
  // ---------------------------------------------------------------
  b.fillRect(58, 64, 17, 13, Tile.StoneFloor);
  b.outlineRect(58, 64, 17, 13, Tile.WallStone);
  b.set(65, 64, Tile.DoorwayStoneWide).set(66, 64, Tile.DoorwayStoneWide); // onto the Market Walk
  b.set(70, 64, Tile.WallStoneWindow).set(74, 69, Tile.WallStoneWindow).set(62, 76, Tile.WallStoneWindow);
  // The strongroom, windowless, walled off west.
  for (let y = 65; y <= 71; y++) b.set(62, y, Tile.WallStone);
  for (let x = 59; x <= 61; x++) b.set(x, 71, Tile.WallStone);
  b.set(62, 68, Tile.DoorwayStone);
  b.set(59, 66, Tile.Vault);
  b.set(59, 69, Tile.BankChest).set(61, 69, Tile.BankChest);
  b.setDetail(60, 67, Detail.Rug);
  // The grading floor: counters facing the door, racks behind.
  b.set(65, 68, Tile.Counter).set(66, 68, Tile.Counter).set(67, 68, Tile.Counter);
  b.set(70, 66, Tile.ToolRack).set(72, 66, Tile.ToolRack); // the hide racks
  b.set(70, 70, Tile.CrateGoods).set(71, 70, Tile.CrateGoods); // graded bales
  b.set(64, 71, Tile.Lectern); // the grade book
  b.set(72, 71, Tile.Crate);
  b.setDetail(68, 70, Detail.Rug).setDetail(69, 70, Detail.Rug);
  b.setDetail(65, 65, Detail.Doormat).setDetail(66, 65, Detail.Doormat);
  // The back rooms: Ranna west, Inga east, a wall of habit between.
  for (let x = 59; x <= 73; x++) if (x !== 63 && x !== 70) b.set(x, 73, Tile.WallStone);
  b.set(63, 73, Tile.DoorwayStone).set(70, 73, Tile.DoorwayStone);
  b.set(66, 73, Tile.WallStone);
  b.set(59, 75, Tile.Bed).set(60, 75, Tile.Bed);
  b.set(65, 75, Tile.Cabinet);
  b.set(72, 75, Tile.Bed).set(73, 75, Tile.Bed);
  b.set(68, 75, Tile.Bookshelf); // Inga's ledgers, going back to the first fold
  b.set(56, 65, Tile.LampPost);
  b.sign(69, 63, 'THE HIDEHALL', [
    'hides graded, coin counted',
    'argue with the grade, not with Inga',
  ], Tile.HangingSign);

  // ---------------------------------------------------------------
  // THE CHANDLERY — Ulfa's shop on the Market Walk: the lamp-fill
  // and the candles, boxed by the gross for the road south. Every
  // lamp between here and the Glasswater burns what this room pours.
  // ---------------------------------------------------------------
  b.fillRect(80, 65, 9, 7, Tile.WoodFloor);
  b.outlineRect(80, 65, 9, 7, Tile.WallWood);
  b.set(84, 65, Tile.DoorwayWood); // onto the Market Walk
  b.set(80, 68, Tile.WallWoodWindow).set(88, 68, Tile.WallWoodWindow);
  b.set(82, 67, Tile.Counter).set(83, 67, Tile.Counter);
  b.set(81, 66, Tile.Cabinet).set(86, 66, Tile.Cabinet); // the candle cases
  b.set(87, 70, Tile.Barrel).set(81, 70, Tile.Barrel); // the fill
  b.set(85, 69, Tile.Workbench); // the wick bench
  b.set(83, 70, Tile.Bed).set(84, 70, Tile.Bed);
  b.setDetail(84, 66, Detail.Doormat);
  b.sign(81, 64, 'THE CHANDLERY', [
    'tallow dips and lamp fill',
    'the road south burns a barrel a week',
  ], Tile.HangingSign);

  // ---------------------------------------------------------------
  // THE RENDERY — downwind south-east, where the pitch-yard law puts
  // it: the smoke huts hung with the winter's meat, the tallow vats,
  // the barrel line, and Geir the smokemaster, who smells of it and
  // has stopped apologizing. The smell is the town's, the way pitch
  // is Pinewatch's.
  // ---------------------------------------------------------------
  b.fillRect(78, 75, 21, 12, Tile.Dirt);
  // Two smoke huts: stone boxes, a low fire, the racks above it.
  for (const hx of [80, 87] as const) {
    b.fillRect(hx, 76, 5, 5, Tile.StoneFloor);
    b.outlineRect(hx, 76, 5, 5, Tile.WallStone);
    b.set(hx + 2, 80, Tile.DoorwayStone);
    b.set(hx + 2, 78, Tile.Campfire);
    b.set(hx + 1, 77, Tile.ToolRack).set(hx + 3, 77, Tile.ToolRack);
  }
  // The tallow shed: vat room and the smokemaster's cot.
  b.fillRect(93, 76, 6, 8, Tile.WoodFloor);
  b.outlineRect(93, 76, 6, 8, Tile.WallWood);
  b.set(93, 79, Tile.DoorwayWood); // door west, onto the yard
  b.set(96, 76, Tile.WallWoodWindow);
  b.set(94, 77, Tile.Basin).set(96, 77, Tile.Basin); // the render vats
  b.set(97, 80, Tile.Workbench);
  b.set(94, 82, Tile.Bed).set(95, 82, Tile.Bed);
  b.set(97, 82, Tile.Barrel);
  // The open-air line: cooling barrels and the drying rails.
  b.set(88, 84, Tile.Barrel).set(89, 84, Tile.Barrel).set(90, 84, Tile.Barrel).set(91, 84, Tile.Barrel);
  b.set(80, 83, Tile.RailWood).set(81, 83, Tile.RailWood).set(82, 83, Tile.RailWood).set(83, 83, Tile.RailWood);
  b.set(85, 84, Tile.CrateGoods);
  b.set(80, 85, Tile.Stump).set(81, 85, Tile.Stump); // the smoke wood
  b.setDetail(84, 82, Detail.Pebbles);
  b.sign(79, 74, 'THE RENDERY', [
    'tallow and smoked meat',
    'the smell washes off, mostly',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE SMITHY — Eirik: points, traps, shoe nails, and mending. A
  // working smith, not a master, and honest about it: masterwork
  // means a journey to Silverfall and he will tell you so himself.
  // One furnace, one anvil, and the wolf-iron traps on the wall.
  // ---------------------------------------------------------------
  b.fillRect(65, 80, 11, 7, Tile.StoneFloor);
  b.outlineRect(65, 80, 11, 7, Tile.WallStone);
  b.set(65, 83, Tile.DoorwayStone); // door west, toward the gate plaza
  b.set(70, 80, Tile.WallStoneWindow).set(75, 83, Tile.WallStoneWindow);
  b.fillRect(62, 83, 3, 1, Tile.Dirt); // the smith's apron, off the gate plaza
  b.set(67, 81, Tile.Furnace);
  b.set(69, 82, Tile.Anvil);
  b.set(71, 81, Tile.Basin); // the quench
  b.set(73, 81, Tile.ToolRack); // the traps, jaws wired shut
  b.set(67, 84, Tile.Counter); // the commission counter
  b.set(72, 85, Tile.Bed).set(73, 85, Tile.Bed);
  b.set(70, 85, Tile.Crate);
  b.setDetail(66, 83, Detail.Doormat);
  b.setDetail(66, 86, bracketSignDetail(2));
  b.set(67, 87, awningTile('board', 7)).set(68, 87, awningTile('board', 7));
  b.sign(64, 79, 'THE SMITHY', [
    'points, traps, and mending',
    'masterwork means Silverfall, ask him',
  ], Tile.HangingSign);

  // ---------------------------------------------------------------
  // THE WARDHUT — the Fellwatch's bunks by the rendery corner: three
  // beds warm from each other, the rack by the door, and the rota
  // that puts one at the gate, one at the beacon, one at the drove.
  // ---------------------------------------------------------------
  b.fillRect(93, 65, 5, 7, Tile.WoodFloor);
  b.outlineRect(93, 65, 5, 7, Tile.WallWood);
  b.set(95, 65, Tile.DoorwayWood); // onto the Market Walk, a step from the herdgate
  b.set(93, 68, Tile.WallWoodWindow);
  b.set(94, 67, Tile.Bed).set(94, 69, Tile.Bed).set(96, 70, Tile.Bed);
  b.set(96, 66, Tile.WeaponRack);
  b.setDetail(95, 66, Detail.Doormat);
  b.setDetail(95, 71, wallBannerDetail(7));

  // ---------------------------------------------------------------
  // THE HORN AND HEARTH — the inn by the south gate, and the only
  // room in forty cold miles where the fire truly never dies.
  // Brandulf keeps it loud on purpose. The buyer Hallward lodges in
  // the good room and is politely not sold the fur trade every
  // single morning; Grimm the pedlar pitches by the north wall and
  // buys what he should not.
  // ---------------------------------------------------------------
  b.fillRect(34, 70, 17, 15, Tile.WoodFloor);
  b.outlineRect(34, 70, 17, 15, Tile.WallWood);
  b.set(50, 76, Tile.DoorwayWood).set(50, 77, Tile.DoorwayWood); // double door, onto the street
  b.set(38, 70, Tile.WallWoodWindow).set(45, 70, Tile.WallWoodWindow);
  b.set(34, 76, Tile.WallWoodWindow).set(41, 84, Tile.WallWoodWindow);
  // The common room: the great double hearth, the long boards.
  b.set(35, 72, Tile.Hearth).set(35, 73, Tile.Hearth);
  b.set(38, 74, Tile.Table).set(39, 74, Tile.Table).set(40, 74, Tile.Table);
  b.set(38, 73, Tile.Chair).set(40, 73, Tile.Chair).set(39, 75, Tile.Chair).set(41, 75, Tile.Chair);
  b.set(43, 72, Tile.Table).set(44, 72, Tile.Chair);
  b.set(40, 77, Tile.Table).set(41, 77, Tile.Table);
  b.set(40, 78, Tile.Chair).set(42, 77, Tile.Chair);
  b.setDetail(36, 74, Detail.RugRound);
  b.setDetail(37, 71, Detail.Tapestry).setDetail(38, 71, Detail.Tapestry);
  b.setDetail(38, 76, Detail.Rug).setDetail(39, 76, Detail.Rug);
  // The bar, and Brandulf's cot behind it.
  b.set(45, 73, Tile.Counter).set(45, 74, Tile.Counter).set(45, 75, Tile.Counter);
  b.set(47, 71, Tile.Barrel).set(48, 71, Tile.Barrel).set(49, 71, Tile.Crate);
  b.set(48, 73, Tile.Bed).set(49, 73, Tile.Bed);
  // The kitchen, walled south-west.
  for (let x = 35; x <= 40; x++) b.set(x, 79, Tile.WallWood);
  b.set(37, 79, Tile.DoorwayWood);
  b.set(35, 81, Tile.Basin).set(35, 83, Tile.Cabinet).set(38, 82, Tile.Table);
  b.set(39, 83, Tile.Barrel);
  // The guest wing, south-east: two honest beds and the good room.
  for (let y = 79; y <= 84; y++) b.set(42, y, Tile.WallWood);
  b.set(42, 81, Tile.DoorwayWood);
  b.set(44, 80, Tile.Bed).set(46, 80, Tile.Bed);
  for (let x = 43; x <= 49; x++) if (x !== 44) b.set(x, 82, Tile.WallWood);
  b.set(44, 82, Tile.DoorwayWood);
  b.set(48, 83, Tile.Bed).set(49, 83, Tile.Bed); // the good room: Hallward's, paid to spring
  b.set(43, 83, Tile.Cabinet);
  b.setDetail(49, 76, Detail.Doormat).setDetail(49, 77, Detail.Doormat);
  // The face it shows the street: ochre board roofs, the mug on its
  // bracket, and the coaching fire on the plaza, outside, always.
  b.set(36, 85, awningTile('board', 6)).set(37, 85, awningTile('board', 6));
  b.setDetail(45, 84, bracketSignDetail(0));
  b.sign(51, 71, 'THE HORN AND HEARTH', ['beds, broth, and the fire never dies'], Tile.HangingSign);
  b.set(52, 80, Tile.Campfire);
  b.set(51, 81, Tile.Bench).set(52, 78, Tile.Bench);
  // Grimm's pitch, against the inn's north face: a cart's worth of
  // crates, a small fire, and no sign, which tells you something.
  b.set(36, 67, Tile.Crate).set(37, 67, Tile.Crate).set(36, 68, Tile.Barrel);
  b.set(39, 68, Tile.Campfire);
  b.setDetail(38, 67, Detail.Straw);

  // ---------------------------------------------------------------
  // THE WAYKEEPER'S POST — the gate's west cheek: Signe, the road
  // lamp, and the ledger of who went up the Hartway and who came
  // back. The Waykeepers hold the road; the town holds the walls;
  // both pretend not to check the other's arithmetic.
  // ---------------------------------------------------------------
  b.fillRect(57, 82, 5, 5, Tile.StoneFloor);
  b.outlineRect(57, 82, 5, 5, Tile.WallStone);
  b.set(57, 84, Tile.DoorwayStone); // door west, onto the gate plaza
  b.set(59, 82, Tile.WallStoneWindow);
  b.set(58, 83, Tile.Bed);
  b.set(58, 85, Tile.Lectern); // the road book
  b.set(60, 85, Tile.Chair);
  b.set(51, 86, Tile.LampPost).set(63, 86, Tile.LampPost); // the road lamps, inside the gate
  b.setDetail(58, 86, wallBannerDetail(7));

  // ---------------------------------------------------------------
  // THE FOLDS — the town's other half. Two stone-cornered folds, the
  // beasts' pool at their head, the bothy, and the herds themselves:
  // the harts winter inside the walls because the walls are why the
  // town eats. Swein the herdmaster counts them the way Inga counts
  // coin, and for the same reason.
  // ---------------------------------------------------------------
  // The bothy first, at the folds' head beside the warm pool: Swein's
  // bed, the herders' bunks, the drove horn by the door, and its own
  // plank over the Warm Run — the herd master lives upstream of his
  // beasts and downstream of nothing.
  b.fillRect(29, 50, 6, 6, Tile.WoodFloor);
  b.outlineRect(29, 50, 6, 6, Tile.WallWood);
  b.set(31, 55, Tile.DoorwayWood); // door south, to the pool and the folds
  b.set(29, 52, Tile.WallWoodWindow);
  b.set(30, 51, Tile.Bed).set(33, 51, Tile.Bed);
  b.set(30, 53, Tile.Bed);
  b.set(33, 53, Tile.WeaponRack); // the drove horn
  b.setDetail(31, 54, Detail.Doormat);
  b.setDetail(33, 55, pennantDetail(8));
  b.set(31, 57, Tile.Bridge); // the bothy's own plank over the run
  // Fold A, under the Market Walk, gated toward the pool.
  b.outlineRect(22, 64, 9, 8, Tile.Fence);
  b.set(26, 64, Tile.Grass); // the gate gap
  b.setDetail(24, 67, Detail.Straw).setDetail(28, 69, Detail.Straw);
  b.set(23, 70, Tile.Stump); // the salt stump
  // Fold B, below it.
  b.outlineRect(22, 74, 9, 8, Tile.Fence);
  b.set(26, 74, Tile.Grass);
  b.setDetail(25, 77, Detail.Straw).setDetail(28, 79, Detail.Straw);
  b.set(32, 68, Tile.Basin); // the hay trough between the folds
  b.set(33, 71, Tile.BeastPen); // the companion pen, beside the working beasts
  b.setDetail(33, 72, Detail.Straw);
  b.sign(32, 63, 'THE FOLDS', [
    'the wolves do not come in',
    'that is the whole bargain',
    'keep it',
  ], Tile.Signpost);
  // The herds: hind and stag, wintering on the warm water.
  b.npcSpawn('hind', 25.5, 67.5, 2, 3);
  b.npcSpawn('stag', 26.5, 77.5, 2, 1);
  b.npcSpawn('hind', 24.5, 78.5, 2, 2);

  // ---------------------------------------------------------------
  // THE COLD QUAY — outside the shoregate, on the strand. Two plank
  // piers into the Graywater, the salmon racks, Eyvor's hut, and
  // Elder Gunvor's cottage up the strand, facing the ice that took
  // fourteen names and gave one back. Nobody has ever asked her to
  // move inside the walls twice.
  // ---------------------------------------------------------------
  // The piers reach for deep water; the border carries the lake on.
  for (let x = 1; x <= 6; x++) b.set(x, 68, Tile.Dock);
  for (let x = 2; x <= 7; x++) b.set(x, 74, Tile.Dock);
  b.set(0, 66, Tile.SalmonRun).set(1, 72, Tile.SalmonRun).set(0, 78, Tile.FishingSpot);
  // The racks: salmon split and hung in the cold wind.
  b.set(9, 64, Tile.RailWood).set(10, 64, Tile.RailWood).set(11, 64, Tile.RailWood);
  b.set(13, 66, Tile.ToolRack);
  b.set(9, 70, Tile.Barrel).set(9, 71, Tile.Crate);
  // Eyvor's hut: nets, a stove, and a bed that smells of the lake.
  b.fillRect(10, 74, 6, 6, Tile.WoodFloor);
  b.outlineRect(10, 74, 6, 6, Tile.WallWood);
  b.set(15, 76, Tile.DoorwayWood); // door east, onto the lane
  b.set(12, 74, Tile.WallWoodWindow);
  b.set(11, 75, Tile.Bed).set(11, 76, Tile.Bed);
  b.set(14, 78, Tile.Hearth);
  b.set(11, 78, Tile.ToolRack); // the nets
  b.setDetail(15, 77, Detail.Doormat);
  b.set(16, 75, Tile.Sand).set(16, 76, Tile.Sand).set(16, 77, Tile.Sand);
  b.sign(12, 71, 'THE COLD QUAY', [
    'the salmon run under the ice shelf',
    'no boats past the point after first frost',
  ], Tile.Signpost);
  // Gunvor's cottage: stone, because she has had enough of things
  // that burn. The bench outside faces the water. She was at the
  // out-camps in the Wolfwinter, and the fifteenth name on the stone
  // at Pinewatch is an argument she could end with one sentence.
  b.fillRect(10, 52, 7, 7, Tile.StoneFloor);
  b.outlineRect(10, 52, 7, 7, Tile.WallStone);
  b.set(13, 58, Tile.DoorwayStone); // door south
  b.set(10, 55, Tile.WallStoneWindow).set(16, 55, Tile.WallStoneWindow);
  b.set(11, 53, Tile.Bed).set(12, 53, Tile.Bed);
  b.set(15, 53, Tile.Hearth);
  b.set(11, 56, Tile.Table).set(12, 56, Tile.Chair);
  b.set(15, 56, Tile.Cabinet);
  b.setDetail(13, 57, Detail.Doormat);
  b.set(8, 57, Tile.Bench); // she sits here at dusk. every dusk.
  b.set(9, 51, Tile.FlowerBox); // and grows something anyway

  // ---------------------------------------------------------------
  // THE GROVE — the wind-break between Horn Hall and the folds: the
  // stand the town kept when it cleared its ground, because a fell
  // town without a wind-break is a lesson you only need once. The
  // Warm Run threads it; the herds browse its hem.
  // ---------------------------------------------------------------
  for (let y = 34; y < 54; y++) {
    for (let x = 24; x <= 50; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass) continue;
      const nearRun = RUN.some(([rx, ry]) => Math.abs(rx - x) + Math.abs(ry - y) <= 2);
      if (nearRun) continue; // the banks stay open and green
      // A wood that leans on a wall reads as a wood painted onto it:
      // the grove keeps two tiles of air off every built thing.
      let crowds = false;
      for (let dy = -2; dy <= 2 && !crowds; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const t2 = b.get(x + dx, y + dy);
          if (
            t2 === Tile.WallWood || t2 === Tile.WallStone || t2 === Tile.Path ||
            t2 === Tile.Dirt || t2 === Tile.Fence || t2 === Tile.WallWoodWindow
          ) {
            crowds = true;
            break;
          }
        }
      }
      if (crowds) continue;
      const roll = fellRng(x, y);
      if (roll < 0.11) b.set(x, y, Tile.TreePine);
      else if (roll < 0.13) b.set(x, y, Tile.SaplingPine);
      else if (roll < 0.14) b.set(x, y, Tile.Rock);
      else if (roll < 0.22) b.set(x, y, Tile.GrassTall);
    }
  }

  // ---------------------------------------------------------------
  // THE DROVE MEADOW — east of the wall, inside the rect: the
  // out-fold, the wallow, and the Darkwater's shore. The herds walk
  // out the herdgate at thaw and the whole strip is their summer.
  // ---------------------------------------------------------------
  b.outlineRect(108, 56, 11, 9, Tile.Fence); // the out-fold
  b.set(108, 60, Tile.Grass); // gap west, toward the gate
  b.setDetail(112, 60, Detail.Straw);
  b.set(116, 62, Tile.Stump);
  // The wallow: a reedy dip the drove drinks at, harmonizing with
  // the pond just past the border.
  b.fillEllipse(122, 53, 4, 3, Tile.Swamp);
  b.set(120, 51, Tile.FibrePlant).set(125, 55, Tile.FibrePlant);
  b.set(114, 44, Tile.Stump); // driftwood, dragged up and forgotten
  b.set(104, 42, Tile.Bench); // the shore bench nobody admits to using
  b.sign(108, 41, 'THE DARKWATER', [
    'no boat has crossed it',
    'no reason you should be the first',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // SNOW — the fell's ground truth. Everywhere but the melt ring:
  // heavy on the north strip and the shelves, banked along the wall
  // feet, thinning south. The melt ring around the Kettle, the Warm
  // Run's banks, and the pool stay bare and green — the town's whole
  // argument, visible from the gate.
  // ---------------------------------------------------------------
  const warm = (x: number, y: number): boolean => {
    const dk = ((x - 84) / 14) ** 2 + ((y - 44) / 11) ** 2; // the Kettle's melt
    if (dk <= 1) return true;
    if (RUN.some(([rx, ry]) => Math.abs(rx - x) + Math.abs(ry - y) <= 2)) return true;
    const dp = ((x - 26) / 6) ** 2 + ((y - 59) / 4) ** 2; // the beasts' pool
    return dp <= 1;
  };
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (warm(x, y)) continue;
      const lvl = b.levelAt(x, y);
      // Never dress a fence rim: the cliff owns every tile with a
      // lower 8-neighbor, and the auto-fence refuses to bury snow.
      let rim = false;
      for (let dy = -1; dy <= 1 && !rim; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx !== 0 || dy !== 0) && b.levelAt(x + dx, y + dy) < lvl) {
            rim = true;
            break;
          }
        }
      }
      if (rim) continue;
      // The stones keep a bare circle. Nobody sweeps it. It is bare.
      if (((x - 26) / 7) ** 2 + ((y - 4) / 6) ** 2 <= 1) continue;
      const roll = fellRng(x + 500, y);
      // Heavy in the north and on the shelves, banked by walls, thin south.
      const near =
        b.get(x - 1, y) === Tile.WallGarrison ||
        b.get(x + 1, y) === Tile.WallGarrison ||
        b.get(x, y - 1) === Tile.WallGarrison;
      let density = lvl > 0 ? 0.5 : y < 18 ? 0.45 : near ? 0.55 : y < 60 ? 0.12 : 0.08;
      // THE SEAM LAW: worldgen deals no snow on flat ground, so the
      // authored white fades to nothing before it can meet the wild
      // meadow in a ruler line. Snow is the fell's lee, not its edge.
      const hem = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      if (hem < 8) density *= hem / 8;
      if (roll < density) b.set(x, y, Tile.Snow);
    }
  }
  // The melt ring blooms instead: the one green circle in the north.
  for (let y = 32; y <= 62; y++) {
    for (let x = 66; x <= 100; x++) {
      if (!warm(x, y)) continue;
      const t = b.get(x, y);
      if (t !== Tile.Grass) continue;
      const roll = fellRng(x + 900, y);
      if (roll < 0.05) b.setDetail(x, y, Detail.Flowers);
      else if (roll < 0.12) b.setDetail(x, y, Detail.Tuft);
      else if (roll < 0.14) b.set(x, y, Tile.BerryBush);
    }
  }

  // ---------------------------------------------------------------
  // SOFT EDGES — the fell coming up to the hems: lone pines (the
  // taiga's last outriders), rock, tall grass. Sparse on purpose:
  // past the treeline the land does not crowd, it watches.
  // ---------------------------------------------------------------
  b.set(12, 22, Tile.Rock).set(8, 34, Tile.TreePine).set(5, 44, Tile.Rock);
  b.set(104, 50, Tile.TreePine).set(110, 70, Tile.TreePine).set(120, 78, Tile.Rock);
  b.set(106, 82, Tile.TreePine).set(122, 88, Tile.TreePine).set(114, 90, Tile.Rock);
  b.set(60, 4, Tile.TreePine).set(72, 6, Tile.Rock).set(50, 2, Tile.TreePine);
  b.set(42, 92, Tile.TreePine).set(70, 92, Tile.Rock).set(88, 91, Tile.TreePine);
  b.set(98, 93, Tile.TreePine).set(46, 90, Tile.Rock);
  b.scatterDetail(Detail.Tuft, 0.05);
  b.scatterDetail(Detail.Pebbles, 0.03, [Tile.Snow]);

  // ---------------------------------------------------------------
  // THE FELL DOOR (the Red Company epic): the back-lot between the
  // Speaker's south wall and the Hidehall's north face — a yard both
  // buildings turn their backs on. A hatch, a crate, no lamp, no
  // sign, no name. You find it or you're told.
  // ---------------------------------------------------------------
  b.fillRect(60, 55, 4, 4, Tile.Dirt);
  b.portal(61, 56, Tile.PortalDown, { x: 225.5, y: 569.5 }, UNDERWORLD_PLANE_ID); // the Hartfell alcove
  b.set(63, 55, Tile.Crate).set(60, 58, Tile.Rock);
  b.setDetail(62, 57, Detail.Pebbles).setDetail(60, 56, Detail.Tuft);

  // ---------------------------------------------------------------
  // THE PEOPLE — eighteen named lives and the Fellwatch, on the
  // horn's clock and the moot's. Placements are the POST each routine
  // measures from; the sleepers walk to real beds by way of a
  // walkable cardinal neighbour (the cardinal-stand law).
  // ---------------------------------------------------------------
  b.actor('speaker_ashild', 78.5, 27.5, Math.PI / 2, 'hart_speaker');
  b.actor('springkeeper_maeva', 92.5, 30.5, Math.PI / 2, 'hart_springkeeper');
  b.actor('huntmaster_kolgrim', 47.5, 23.5, Math.PI / 2, 'hart_huntmaster');
  b.actor('guide_sunn', 66.5, 21.5, Math.PI, 'hart_guide');
  b.actor('furrier_ranna', 66.5, 67.5, Math.PI / 2, 'hart_furrier');
  b.actor('tallywife_inga', 60.5, 68.5, Math.PI / 2, 'hart_tallywife');
  b.actor('chandler_ulfa', 82.5, 66.5, Math.PI / 2, 'hart_chandler');
  b.actor('smokemaster_geir', 86.5, 82.5, Math.PI / 2, 'hart_smokemaster');
  b.actor('bonecarver_tuli', 92.5, 57.5, Math.PI / 2, 'hart_bonecarver');
  b.actor('smith_eirik', 68.5, 82.5, Math.PI / 2, 'hart_smith');
  b.actor('innkeep_brandulf', 46.5, 74.5, Math.PI, 'hart_innkeep');
  b.actor('herdmaster_swein', 31.5, 73.5, Math.PI / 2, 'hart_herdmaster');
  b.actor('tithekeeper_orvar', 31.5, 28.5, Math.PI / 2, 'hart_tithekeeper');
  b.actor('elder_gunvor', 9.5, 57.5, Math.PI, 'hart_elder');
  b.actor('netkeeper_eyvor', 5.5, 68.5, Math.PI, 'hart_netkeeper');
  b.actor('waykeeper_signe', 56.5, 85.5, Math.PI / 2, 'hart_waykeeper');
  b.actor('buyer_hallward', 43.5, 73.5, Math.PI / 2, 'hart_buyer');
  b.actor('pedlar_grimm', 38.5, 66.5, Math.PI / 2, 'hart_pedlar');
  // The Fellwatch rota: the gate, the beacon, the drove.
  b.actor('hartfell_watch', 54.5, 86.5, Math.PI / 2, 'hart_watch');
  b.actor('hartfell_watch', 39.5, 12.5, Math.PI / 2, 'hart_watch_beacon');
  b.actor('hartfell_watch', 98.5, 63.5, Math.PI / 2, 'hart_watch');
  // The herders, one to each fold.
  b.actor('hartfell_herder', 26.5, 65.5, Math.PI / 2, 'hart_herder');
  b.actor('hartfell_herder', 27.5, 77.5, Math.PI / 2, 'hart_herder');

  // The spawn hearth of the far north: the Kettle's north walk,
  // between the Springhall's door and the warm water.
  b.spawn(84.5, 37.5);
  return b.build();
}

/** Stable per-tile hash so the town is byte-identical every boot. */
function fellRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x5f11;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 0xffffffff;
}
