import { Detail, Tile, awningTile, bracketSignDetail, pennantDetail, trellisDetail } from '@arx/shared';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Dawnmead — the awakening village, rebuilt bespoke (the curation pass).
 *
 * 96x64 at world (-96,16). New characters wake inside the Waking Ring at
 * the west end and the whole village unfolds eastward from that first
 * step: the green court and its well, the elder's porch, the hearth
 * court, the tinker's bench, the farmstead, the berry brook, and at
 * last the lane east where the First Road begins at world (0,48).
 *
 * LAWS THIS FILE KEEPS (move nothing without updating the web):
 * - Spawn (14.5,32.5) inside the Ring; the pad at (14,32) is StoneFloor
 *   (worldgen.test pins world (-82,48)); five standing stones, exactly
 *   (rowan_awakening: "the five stones behind you").
 * - Lane rows 31-33 reach x95 as Path (first_road starts world (0,48)).
 * - The well's NW stone is (33,27) (worldgen.test pins world (-63,43)).
 * - ONE Campfire (34,36), ONE Workbench (40,35), ONE ChestWood (68,50)
 *   in the whole zone — content.test counts them exactly.
 * - Routine geometry (offsets hang off the posts; see routines/defs):
 *   green benches (26,35)+(27,35) [Rowan sits 16-18], Fen's lunch chair
 *   (36,38) with its table (37,38), the coop gate EAST (33,16), the
 *   pasture gate WEST (45,18), the trough (50,15), Hobb's corridor
 *   x34-35, and every bed a night path ends on: Rowan (28,23), Iona
 *   (28,41), Bryn (16,41), Fen's spare (20,41), Hobb (37,19), Pip
 *   (42,19) — all bed FEET of 2-tile head-north runs.
 * - The rat shed keeps its three sagging gaps (the dilapidated-interior
 *   render path cites them) and its doorway at (67,46).
 * - The brook touches BOTH n/s borders (edge-harmony outflow law).
 * - The corridor east stays predator-free; fauna here is only the
 *   authored chicken/cow/rat spawns.
 * - Occlusion law: the camera is a tilted bird's eye — tall art paints
 *   over what stands NORTH of it, so nothing tall sits on the 1-2 rows
 *   south of doors, stations, signs, forage nodes, or actor posts.
 */
export function buildDawnmead(): ZoneDef {
  const b = new ZoneBuilder('dawnmead', 'Dawnmead', { x: -96, y: 16 }, 96, 64, Tile.Grass);

  // ---------------------------------------------------------------
  // STREETS FIRST. One honest lane west-to-east, then the working
  // ways that grew off it: the farm track, the ford trail, the
  // orchard walk, and the unlit hunters' trail north.
  // ---------------------------------------------------------------
  b.path({ x: 10, y: 32 }, { x: 95, y: 32 }, 3);
  // The farm lane: a trampled dirt way along the farmhouse fronts,
  // and the corridor between the pens — Hobb's whole commute.
  b.fillRect(33, 24, 13, 2, Tile.Dirt);
  b.fillRect(34, 13, 2, 11, Tile.Dirt);
  b.set(34, 26, Tile.Dirt).set(34, 27, Tile.Dirt); // down to the court's shoulder
  b.set(44, 18, Tile.Dirt).set(46, 18, Tile.Dirt); // worn at the pasture gate
  // The hunters' trail: single-file dirt to the north hem at x~32,
  // where geography's unlit shortcut threads the wolf dens.
  for (let y = 6; y <= 12; y++) b.set(34, y, Tile.Dirt);
  b.set(33, 3, Tile.Dirt).set(33, 4, Tile.Dirt).set(33, 5, Tile.Dirt);
  b.set(32, 0, Tile.Dirt).set(32, 1, Tile.Dirt).set(32, 2, Tile.Dirt);

  // ---------------------------------------------------------------
  // THE WAKING RING — the arrival. A stone-floored circle inside five
  // weathered standing stones, flowers crowding the cracks. Nobody
  // explains it; the village only tends it.
  // ---------------------------------------------------------------
  b.fillEllipse(14, 32, 4, 3, Tile.StoneFloor);
  b.set(14, 28, Tile.Rock);
  b.set(10, 30, Tile.Rock);
  b.set(18, 29, Tile.Rock);
  b.set(10, 35, Tile.Rock);
  b.set(17, 36, Tile.Rock);
  b.setDetail(12, 29, Detail.Flowers).setDetail(16, 35, Detail.Flowers);
  b.setDetail(11, 33, Detail.Flowers).setDetail(15, 29, Detail.Flowers);
  b.setDetail(13, 36, Detail.Flowers).setDetail(18, 33, Detail.Flowers);
  b.setDetail(12, 26, Detail.Flowers).setDetail(16, 27, Detail.Flowers);
  b.setDetail(8, 32, Detail.Flowers).setDetail(19, 31, Detail.Flowers);
  b.setDetail(11, 31, Detail.Pebbles).setDetail(16, 33, Detail.Pebbles);
  b.setDetail(13, 30, Detail.Pebbles);
  b.set(9, 28, Tile.GrassTall).set(19, 35, Tile.GrassTall);
  b.set(8, 34, Tile.GrassTall);
  // Lamps frame the first steps east out of the Ring.
  b.set(20, 30, Tile.LampPost);
  b.set(20, 34, Tile.LampPost);

  // ---------------------------------------------------------------
  // ELDER ROWAN'S COTTAGE — the keeper of the Ring, north of the
  // green, with the porch he watches the wakers from ("I can see it
  // from the porch"). Study on the west wall, bed nook east, the
  // keeper's tapestry over the ledger.
  // ---------------------------------------------------------------
  b.fillRect(22, 20, 9, 8, Tile.WoodFloor);
  b.outlineRect(22, 20, 9, 8, Tile.WallWood);
  b.set(29, 27, Tile.DoorwayWood); // south door onto the porch
  b.set(25, 27, Tile.WallWoodWindow).set(27, 27, Tile.WallWoodWindow);
  b.set(22, 23, Tile.WallWoodWindow).set(30, 23, Tile.WallWoodWindow);
  // The study: shelf, the keeper's ledger, and the tapestry above it.
  b.set(23, 21, Tile.Bookshelf);
  b.set(24, 21, Tile.Lectern);
  b.setDetail(24, 20, Detail.Tapestry).setDetail(25, 20, Detail.Tapestry);
  b.set(29, 21, Tile.Cabinet);
  b.set(23, 25, Tile.Hearth);
  b.set(25, 23, Tile.Table).set(26, 23, Tile.Chair);
  for (let y = 24; y <= 25; y++) {
    for (let x = 25; x <= 26; x++) b.setDetail(x, y, Detail.Rug);
  }
  // The bed nook: a two-tile bed, head north, foot at (28,23) — the
  // exact tile his night path lies down on.
  b.set(28, 22, Tile.Bed).set(28, 23, Tile.Bed);
  b.setDetail(27, 23, Detail.RugRound);
  b.setDetail(29, 26, Detail.Doormat);
  // The porch: a TRUE lifted deck now (THE OUTWARD FACE) — boards
  // off the dock's stance, his evening chair riding them, flowers
  // either side, and the worn step where his boots come down.
  for (let x = 24; x <= 29; x++) b.set(x, 28, Tile.PorchDeck);
  b.set(25, 28, Tile.Chair);
  b.set(23, 28, Tile.FlowerBox).set(30, 28, Tile.FlowerBox);
  b.set(29, 29, Tile.Dirt); // the worn step
  // The keeper's wall garden: a rose trellis climbing beside the
  // study window, a bloom basket by the door he watches from.
  b.setDetail(23, 27, trellisDetail(1));
  b.setDetail(28, 27, Detail.WallBasket);
  // The herb strip between his back wall and the coop.
  b.setDetail(24, 18, Detail.Flowers).setDetail(27, 19, Detail.Flowers);
  b.setDetail(29, 18, Detail.Flowers);

  // ---------------------------------------------------------------
  // THE GREEN COURT — the well at the village's crossing, paved and
  // sat around. The notice board carries the village's own words.
  // ---------------------------------------------------------------
  b.fillRect(31, 26, 8, 5, Tile.StoneFloor);
  b.set(33, 27, Tile.WallStone).set(34, 27, Tile.WallStone); // the well
  b.set(33, 28, Tile.WallStone).set(34, 28, Tile.WallStone);
  b.set(36, 28, Tile.Bench);
  b.set(31, 26, Tile.FlowerBox).set(38, 30, Tile.FlowerBox);
  b.sign(37, 26, 'DAWNMEAD', ['A green, a brook, and', 'more chickens than people.'], Tile.Signpost);
  b.setDetail(32, 29, Detail.Pebbles).setDetail(36, 27, Detail.Pebbles);
  b.set(36, 30, Tile.LampPost);
  // The green benches south of the lane, facing the hearth court —
  // Rowan takes them at dusk (his sit offset lands on (26,35)).
  b.set(26, 35, Tile.Bench).set(27, 35, Tile.Bench);

  // ---------------------------------------------------------------
  // IONA'S HEARTH-HOUSE — the closest thing Dawnmead has to an inn.
  // Door north onto the fire court; inside, the warmest room in the
  // village: hearth, long rug, her bed by the window.
  // ---------------------------------------------------------------
  b.fillRect(26, 39, 9, 8, Tile.WoodFloor);
  b.outlineRect(26, 39, 9, 8, Tile.WallWood);
  b.set(29, 39, Tile.DoorwayWood); // north door, facing the fire
  b.set(27, 39, Tile.WallWoodWindow).set(32, 39, Tile.WallWoodWindow);
  b.set(28, 46, Tile.WallWoodWindow).set(31, 46, Tile.WallWoodWindow);
  b.set(26, 42, Tile.WallWoodWindow);
  b.set(28, 40, Tile.Bed).set(28, 41, Tile.Bed); // her bed; night path lies at (28,41)
  b.setDetail(27, 41, Detail.RugRound);
  b.set(32, 40, Tile.Hearth);
  b.set(33, 40, Tile.Cabinet); // corner block — never seal a floor tile behind the hearth
  b.set(33, 44, Tile.Barrel).set(33, 45, Tile.Crate);
  b.set(27, 44, Tile.Basin);
  b.set(30, 43, Tile.Table).set(31, 43, Tile.Table);
  b.set(29, 43, Tile.Chair).set(32, 43, Tile.Chair);
  for (let y = 41; y <= 42; y++) {
    for (let x = 29; x <= 31; x++) b.setDetail(x, y, Detail.Rug);
  }
  b.setDetail(29, 40, Detail.Doormat);
  b.set(29, 38, Tile.Dirt); // the worn threshold
  // Boxes west of the door only — the walk in from the fire stays clear.
  b.set(27, 37, Tile.FlowerBox).set(28, 37, Tile.FlowerBox);

  // THE FIRE COURT — the village campfire and the supper table on
  // trampled ground between Iona's door and Fen's bench. The ONE
  // campfire; the cooking lesson happens here.
  b.fillEllipse(36, 37, 3, 2, Tile.Dirt);
  b.set(34, 36, Tile.Campfire);
  b.set(37, 38, Tile.Table);
  b.set(36, 38, Tile.Chair).set(38, 38, Tile.Chair); // Fen lunches at (36,38)
  b.setDetail(35, 37, Detail.Pebbles).setDetail(37, 36, Detail.Pebbles);

  // ---------------------------------------------------------------
  // FEN'S BENCH — the open-air workshop on the green's east shoulder:
  // the ONE workbench, the sawhorse "just past the crate", sawdust,
  // stock, and honest clutter with room to walk it.
  // ---------------------------------------------------------------
  b.fillEllipse(41, 35, 3, 2, Tile.Dirt);
  b.set(40, 35, Tile.Workbench);
  b.set(39, 36, Tile.Barrel);
  b.set(41, 36, Tile.Crate);
  b.set(42, 35, Tile.Sawhorse);
  b.set(44, 36, Tile.CrateGoods);
  b.set(46, 36, Tile.Stump); // the log that fed the sawhorse
  b.sign(45, 34, "FEN'S BENCH", ['Mended, made, or traded.', 'Mind the sawdust.'], Tile.Signpost);
  b.setDetail(40, 36, Detail.Sawdust).setDetail(41, 35, Detail.Sawdust);
  b.setDetail(42, 36, Detail.Sawdust).setDetail(41, 34, Detail.Sawdust);
  b.setDetail(43, 35, Detail.Sawdust);

  // ---------------------------------------------------------------
  // THE FARMSTEAD — Hobb's house grown a proper kitchen, the coop,
  // and the pasture, laid so the farmhand's rounds run on straight
  // open legs (coop gate EAST, pasture gate WEST, corridor x34-35).
  // ---------------------------------------------------------------
  b.fillRect(36, 16, 8, 8, Tile.WoodFloor);
  b.outlineRect(36, 16, 8, 8, Tile.WallWood);
  b.set(39, 23, Tile.DoorwayWood); // south door onto the farm lane
  b.set(37, 23, Tile.WallWoodWindow).set(41, 23, Tile.WallWoodWindow);
  // A plain linen shed awning over the farm door — Hobb keeps the
  // rain off his threshold, nothing fancier than that. Ivy takes the
  // wall beside the window, the way it does on working houses.
  b.set(39, 24, awningTile('shed', 0));
  b.setDetail(38, 23, trellisDetail(0));
  b.set(36, 19, Tile.WallWoodWindow).set(43, 19, Tile.WallWoodWindow);
  // Beds along the north wall: Hobb's and Pip's, heads to the wall.
  // Both night paths lie down on the FOOT tiles (37,19) and (42,19).
  b.set(37, 18, Tile.Bed).set(37, 19, Tile.Bed);
  b.set(42, 18, Tile.Bed).set(42, 19, Tile.Bed);
  b.set(37, 17, Tile.Cabinet).set(42, 17, Tile.Cabinet);
  b.setDetail(38, 19, Detail.RugRound);
  // The kitchen half: hearth, table by the east window, the wash basin.
  b.set(37, 22, Tile.Hearth);
  b.set(41, 22, Tile.Table).set(40, 22, Tile.Chair);
  b.set(42, 22, Tile.Basin);
  b.set(37, 21, Tile.Crate);
  for (let y = 20; y <= 21; y++) {
    for (let x = 39; x <= 40; x++) b.setDetail(x, y, Detail.Rug);
  }
  b.setDetail(39, 22, Detail.Doormat);
  // The chicken coop: fenced dirt, straw bedding, gate on the east.
  // Gates are placed OPEN so Hobb's rounds and the hens' scatter stay
  // unblocked until a player swings them shut (NPCs cannot work
  // latches — never author these shut).
  b.fillRect(27, 13, 6, 4, Tile.Dirt);
  b.outlineRect(26, 12, 8, 6, Tile.Fence);
  b.set(33, 16, Tile.FenceGate); // the east gate, standing open
  b.setDetail(28, 14, Detail.Straw).setDetail(30, 15, Detail.Straw);
  b.setDetail(31, 13, Detail.Straw).setDetail(29, 16, Detail.Straw);
  // The cow pasture: grass kept, trough by the north rail, west gate.
  b.outlineRect(45, 14, 12, 9, Tile.Fence);
  b.set(45, 18, Tile.FenceGate); // the west gate, standing open
  b.set(50, 15, Tile.Basin);
  b.setDetail(47, 16, Detail.Straw).setDetail(53, 19, Detail.Straw);
  b.setDetail(50, 20, Detail.Straw);
  // The long grass by the pasture fence — where the stray eggs end up.
  b.set(47, 23, Tile.GrassTall).set(50, 23, Tile.GrassTall);
  b.set(53, 23, Tile.GrassTall).set(56, 23, Tile.GrassTall);
  b.set(57, 20, Tile.GrassTall);
  // THE STALLS (beastcraft v2): the town's beast pen, south of the
  // pasture past the lane's end — the level-10 moment happens in
  // Dawnmead, so the first stable door stands here, with Maren the
  // drover keeping it. Straw drifts where kept animals wait.
  b.set(48, 24, Tile.BeastPen);
  b.setDetail(47, 25, Detail.Straw).setDetail(49, 24, Detail.Straw);

  // ---------------------------------------------------------------
  // THE WARDEN'S LODGE — Bryn's stone watch-house on its drill yard
  // south of the Ring. Bunks west and east, the armory wall between,
  // chamfered shoulders on the yard face: the one martial building.
  // ---------------------------------------------------------------
  b.fillRect(13, 37, 13, 10, Tile.Dirt);
  b.fillRect(15, 39, 8, 7, Tile.StoneFloor);
  b.outlineRect(15, 39, 8, 7, Tile.WallStone);
  b.set(15, 39, Tile.WallStoneDiagSE).set(22, 39, Tile.WallStoneDiagSW);
  b.set(18, 39, Tile.DoorwayStone); // north door onto the yard
  b.set(20, 39, Tile.WallStoneWindow);
  b.set(17, 45, Tile.WallStoneWindow).set(20, 45, Tile.WallStoneWindow);
  // Bunks: Bryn's west, the spare east (Fen boards here). Night paths
  // lie down on the foot tiles (16,41) and (20,41).
  b.set(16, 40, Tile.Bed).set(16, 41, Tile.Bed);
  b.set(20, 40, Tile.Bed).set(20, 41, Tile.Bed);
  b.set(18, 41, Tile.Table); // the duty table between the bunks
  b.set(21, 44, Tile.WeaponRack); // south wall — the east aisle stays open past the bunks
  b.set(16, 44, Tile.Crate);
  b.set(19, 44, Tile.Hearth);
  b.set(17, 43, Tile.Chair);
  for (let x = 17; x <= 18; x++) b.setDetail(x, 42, Detail.Rug);
  b.setDetail(18, 40, Detail.Doormat);
  // The drill yard: racks on the north hem, the training corner, and
  // the bench Bryn ends her rounds on. Clear lines to the door.
  b.set(23, 38, Tile.WeaponRack);
  b.set(25, 38, Tile.ToolRack);
  b.set(14, 38, Tile.Barrel);
  b.set(14, 45, Tile.Crate);
  b.set(24, 45, Tile.Bench);
  b.set(16, 38, Tile.LampPost);
  b.setDetail(15, 42, Detail.Straw).setDetail(23, 42, Detail.Straw);
  b.setDetail(20, 37, Detail.Pebbles);

  // ---------------------------------------------------------------
  // THE BERRY BROOK — down from the north woods, under the lane
  // bridge, past the berry banks, over the wading ford, and out the
  // south hem. Shallows line every reach so nothing ever traps a
  // waker on the wrong bank.
  // ---------------------------------------------------------------
  for (let y = 0; y < 64; y++) {
    const cx = 60 + Math.round(Math.sin(y * 0.16) * 1.6);
    b.set(cx - 1, y, Tile.WaterShallow);
    b.set(cx, y, Tile.Water);
    b.set(cx + 1, y, Tile.WaterShallow);
  }
  // The lane bridge: a raised plank deck carrying rows 31-33. ONE
  // rectangle, centered on the brook at the middle row — a ragged
  // per-row span staggers the ramp mouths and rails at both banks.
  {
    const bcx = 60 + Math.round(Math.sin(32 * 0.16) * 1.6);
    for (let y = 31; y <= 33; y++) {
      for (let x = bcx - 2; x <= bcx + 2; x++) b.set(x, y, Tile.Bridge);
    }
  }
  // Village pennants frame the bridge approach on the west bank.
  b.set(56, 30, Tile.BannerPole);
  b.set(56, 34, Tile.BannerPole);
  // The ford: knee-deep the whole way across, the honest shortcut to
  // the old shed.
  for (let y = 43; y <= 45; y++) {
    const cx = 60 + Math.round(Math.sin(y * 0.16) * 1.6);
    b.set(cx, y, Tile.WaterShallow);
  }
  b.set(58, 26, Tile.FishingSpot);
  b.set(61, 50, Tile.FishingSpot);
  // Willows lean over the water, clear of every path and node.
  b.set(59, 13, Tile.TreeWillow);
  b.set(58, 58, Tile.TreeWillow);

  // THE BERRY GLADE — the foraging lesson, gathered on the near bank
  // south of the bridge exactly where Iona sends you: berries, the
  // tall fibre plants, and sageroot, each standing in open sun.
  b.set(54, 37, Tile.BerryBush);
  b.set(56, 39, Tile.BerryBush);
  b.set(53, 41, Tile.BerryBush);
  b.set(55, 43, Tile.BerryBush);
  b.set(56, 45, Tile.BerryBush);
  b.set(54, 46, Tile.BerryBush);
  b.set(52, 39, Tile.FibrePlant);
  b.set(52, 44, Tile.FibrePlant);
  b.set(51, 42, Tile.WildSagewort);
  b.set(53, 46, Tile.WildSagewort);
  // A last pair upstream for the wanderers.
  b.set(56, 26, Tile.BerryBush);
  b.set(53, 25, Tile.WildSagewort);

  // ---------------------------------------------------------------
  // THE OLD SHED — across the ford, half given back to the weather,
  // where the rats moved in. Bryn's first errand for every waker, and
  // the village traveller's chest waits inside for whoever clears it.
  // The three sagging gaps are load-bearing: the dilapidated-interior
  // render path cites them.
  // ---------------------------------------------------------------
  b.fillRect(65, 47, 5, 4, Tile.Dirt);
  b.outlineRect(64, 46, 7, 6, Tile.WallWood);
  b.set(67, 46, Tile.DoorwayWood);
  b.set(64, 49, Tile.Grass); // the west wall sags open
  b.set(70, 48, Tile.Grass); // and the east one too
  b.set(66, 51, Tile.Grass); // the south corner went first
  b.set(65, 50, Tile.Crate);
  b.set(69, 47, Tile.Barrel);
  b.set(68, 50, Tile.ChestWood);
  b.setDetail(66, 48, Detail.Straw).setDetail(68, 47, Detail.Straw);
  b.setDetail(65, 49, Detail.Straw);
  // What is left of the shed's old pen, leaning into the grass.
  b.set(62, 52, Tile.Fence).set(63, 52, Tile.Fence);
  b.set(72, 49, Tile.Stump);
  b.set(71, 52, Tile.GrassTall).set(63, 51, Tile.GrassTall);
  b.setDetail(66, 53, Detail.Mushroom);
  // The dirt trail from the ford to the shed door.
  b.set(62, 44, Tile.Dirt);
  b.set(63, 44, Tile.Dirt);
  b.set(64, 44, Tile.Dirt);
  b.set(65, 45, Tile.Dirt);
  b.set(66, 45, Tile.Dirt);
  b.set(67, 45, Tile.Dirt);
  b.setDetail(63, 43, Detail.Pebbles).setDetail(65, 44, Detail.Pebbles);

  // ---------------------------------------------------------------
  // THE ORCHARD — fenced rows north of the lane, east of the brook:
  // planted lines, not wild wood, with a gate onto its own walk.
  // ---------------------------------------------------------------
  b.outlineRect(65, 18, 17, 11, Tile.Fence);
  b.set(72, 28, Tile.FenceGate); // the south gate, standing open
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      b.set(67 + col * 3 + (row % 2), 20 + row * 3, Tile.TreeOak);
    }
  }
  b.set(66, 27, Tile.Crate).set(67, 27, Tile.Barrel); // the harvest corner
  b.sign(74, 29, 'THE ORCHARD', ['Windfalls are anybody\'s.', 'Shake nothing. Ask Hobb.'], Tile.Signpost);
  b.set(72, 29, Tile.Dirt).set(72, 30, Tile.Dirt); // the orchard walk
  b.setDetail(70, 22, Detail.Flowers).setDetail(75, 25, Detail.Flowers);

  // The hunters' trail waymarker, where the tended land gives out.
  b.sign(35, 6, "HUNTERS' TRAIL", ['No lamps this way.', 'Wolves den in the north woods.', 'Take the lane east instead.'], Tile.Signpost);

  // The lane east: a shingle sign where the village lets go of you,
  // and lamps so the walk toward the First Road never feels like
  // leaving safety, because it isn't.
  b.sign(65, 30, 'THE EAST LANE', ['Amberford, then the road', 'Keep to the lamps.'], Tile.Signpost);
  b.set(48, 30, Tile.LampPost);
  b.set(68, 34, Tile.LampPost);
  b.set(78, 30, Tile.LampPost);
  b.set(88, 34, Tile.LampPost);

  // ---------------------------------------------------------------
  // THE QUIET QUARTERS — every corner holds a vignette, no voids.
  // ---------------------------------------------------------------
  // The rocky hem NW of the Ring, first cousin to the rise out west.
  b.set(3, 22, Tile.Rock).set(5, 25, Tile.Rock).set(2, 27, Tile.Rock);
  b.setDetail(4, 24, Detail.Mushroom).setDetail(3, 26, Detail.Pebbles);
  b.setDetail(5, 23, Detail.Pebbles);
  // The old oak dell south-west, where Bryn's dusk round turns.
  b.set(12, 41, Tile.TreeOak);
  b.set(8, 45, Tile.TreeOak);
  b.setDetail(10, 43, Detail.Flowers).setDetail(13, 45, Detail.Flowers);
  // The south meadow: open ground and long grass — where Bryn keeps
  // finding goblin tracks (thin_the_meadow hunts here).
  b.set(33, 50, Tile.GrassTall).set(37, 53, Tile.GrassTall);
  b.set(42, 50, Tile.GrassTall).set(46, 54, Tile.GrassTall);
  b.set(39, 55, Tile.GrassTall).set(35, 55, Tile.GrassTall);
  b.set(44, 53, Tile.TreeOak);
  b.setDetail(36, 51, Detail.Flowers).setDetail(43, 56, Detail.Flowers);

  // Meadow life.
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.04);
  b.scatterDetail(Detail.Tuft, 0.06);

  // Edge woods (hand-placed feel: dense at the rim, thinning inward),
  // keeping every worked place open: the lane and its verges, the
  // village core, the ford approach, the orchard and its walk, the
  // trail head, and the shed clearing.
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 96; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 32) <= 4) continue; // the lane breathes
      if (x >= 56 && x <= 71 && y >= 42 && y <= 47) continue; // the ford path
      if (x >= 8 && x <= 58 && y >= 11 && y <= 48) continue; // the village core is tended land
      if (x >= 63 && x <= 83 && y >= 16 && y <= 31) continue; // the orchard and its walk
      if (x >= 30 && x <= 37 && y <= 13) continue; // the hunters' trail head
      if (x >= 60 && x <= 73 && y >= 44 && y <= 52) continue; // the shed clearing
      if (x >= 30 && x <= 50 && y >= 48 && y <= 56) continue; // the south meadow stays open ground
      const edge = Math.min(x, y, 95 - x, 63 - y);
      const density = edge < 4 ? 0.35 : edge < 9 ? 0.12 : 0.012;
      if (meadRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // ---------------------------------------------------------------
  // The animals: penned hens and cows, and the shed rats — the
  // village's whole syllabus of first combat and first produce.
  // ---------------------------------------------------------------
  b.npcSpawn('chicken', 29.5, 15.5, 1.7, 4);
  b.npcSpawn('cow', 50.5, 18.5, 2.4, 2);
  b.npcSpawn('rat', 67, 48.5, 2, 3);

  // ---------------------------------------------------------------
  // The villagers — six lives, each keeping the hours of a routine
  // whose coordinates hang off these posts (the post-is-the-origin
  // law: move a post, and the life moves with it).
  // ---------------------------------------------------------------
  // Rowan waits beside the ring for wakers, and has for forty years.
  b.actor('elder_rowan', 19.5, 30.5, Math.PI, 'rowan_hours');
  // Bryn keeps the yard, walks the green at first light and dusk.
  b.actor('warden_bryn', 23.5, 43.5, -Math.PI / 2, 'warden_rounds');
  // Iona owns the campfire the way captains own ships.
  b.actor('hearthkeeper_iona', 33.5, 37.6, -Math.PI / 2, 'hearth_hours');
  // Hobb's whole day is the corridor between coop and pasture.
  b.actor('farmer_hobb', 34.5, 20.5, -Math.PI / 2, 'dawnmead_farmhand');
  // Fen taps away at the bench and lunches at Iona's fire.
  b.actor('tinker_fen', 40.5, 34.3, Math.PI / 2, 'tinker_hours');
  // Pip orbits the green at a dead run until bedtime.
  b.actor('young_pip', 28.5, 33.5, 0, 'green_scamp');
  // Maren keeps the stalls and talks to the animals more than the
  // owners. No routine: the pen is her whole day, by choice.
  b.actor('drover_maren', 49.5, 25.5, Math.PI);

  b.spawn(14.5, 32.5);
  return b.build();
}

/** Stable per-tile randomness so the village is identical every boot. */
function meadRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x2f61a3b7;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
