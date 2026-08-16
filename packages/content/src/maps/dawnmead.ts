import { Detail, Tile, trellisDetail } from '@arx/shared';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Dawnmead — the village that raises wakers. THE DAWN REMADE rebuild
 * (docs/dawnmead-remade-plan.md is the spec; this file is the ground).
 *
 * 128x96 at world (-128,0), centered on the danger anchor (-64,48).
 * New characters wake inside the Waking Ring west of center and the
 * village unfolds eastward: the green and its well, the Five Stones
 * inn, the farmstead, the bench yard and its forge corner, the
 * cookhouse and the long table, the drill yard where three teachers
 * keep three schools, the copse, the brook, the crab bank, and the
 * old granary where the rats hold court in open daylight. The lane
 * runs the whole way east to the First Road at world (0,48).
 *
 * LAWS THIS FILE KEEPS (move nothing without updating the web):
 * - Spawn (46.5,48.5) = world (-81.5,48.5), UNCHANGED across the
 *   rebuild (worldgen.test pins the world coords; the rescue law and
 *   every old character's respawn depend on it). Five standing
 *   stones exactly, same world tiles as every build before this one.
 * - Lane rows 47-49 reach x127 as Path (first_road starts at world
 *   (0,48)); the hunters' trail leaves the north hem at x64 and the
 *   old road leaves the south hem at x98 (geography pts agree).
 * - ONE Campfire (74,61), ONE Workbench (79,42), ONE ChestWood
 *   (112,62), ONE Furnace (84,45), ONE Anvil (82,45), ONE CookPot
 *   (79,52), ONE BeastPen (87,54) — content.test counts them exactly.
 * - Routine geometry hangs off actor posts (post-is-the-origin law).
 *   Every named villager's night path ends lie:true on the FOOT tile
 *   of a 2-tile head-north bed run; every lie/sit stop stages on a
 *   walkable CARDINAL neighbor first (the cardinal-stand law).
 * - Gates are authored OPEN (NPCs cannot work latches).
 * - The brook touches BOTH n/s borders (edge-harmony outflow law).
 * - The village and the lane stay predator-free (corridor law);
 *   fauna here is only the authored spawns below. Rats and crabs
 *   fight in the OPEN — nothing hides behind a wall in this town.
 * - Occlusion law: tall art paints over what stands NORTH of it, so
 *   nothing tall sits on the 1-2 rows south of doors, stations,
 *   signs, forage nodes, or actor posts.
 */
export function buildDawnmead(): ZoneDef {
  const b = new ZoneBuilder('dawnmead', 'Dawnmead', { x: -128, y: 0 }, 128, 96, Tile.Grass);

  /** The brook's center column at a row (shared by every water read). */
  const brookX = (y: number) => 92 + Math.round(Math.sin(y * 0.16) * 1.6);

  // ---------------------------------------------------------------
  // STREETS FIRST. One honest lane west-to-east from the Waking Ring
  // to the First Road, then the working ways that grew off it: the
  // farm walk down the brook side, the orchard walk, the old-road
  // spur south, and the unlit hunters' trail north.
  // ---------------------------------------------------------------
  b.path({ x: 41, y: 48 }, { x: 127, y: 48 }, 3);
  // The farm walk: from the farmhouse door, east along the field
  // hem, then down the brook side to the lane — the family commute.
  b.set(74, 16, Tile.Dirt).set(74, 17, Tile.Dirt);
  for (let x = 75; x <= 88; x++) b.set(x, 17, Tile.Dirt);
  for (let y = 18; y <= 46; y++) b.set(88, y, Tile.Dirt);
  // The orchard walk: gate to the Ring court, the long way round the
  // west meadow — pickers and dawdlers both.
  for (let y = 25; y <= 44; y++) b.set(28, y, Tile.Dirt);
  for (let x = 29; x <= 40; x++) b.set(x, 45, Tile.Dirt);
  // The hunters' trail: single-file dirt from the green's shoulder to
  // the north hem at x64, where geography's unlit shortcut begins.
  for (let y = 6; y <= 42; y++) b.set(65, y, Tile.Dirt);
  for (let y = 0; y <= 5; y++) b.set(64, y, Tile.Dirt);
  // The old-road spur: a rougher way south past the granary meadow to
  // the south hem at x98. Dirt, not paving — the lamps end here.
  for (let y = 50; y <= 95; y++) b.set(97, y, Tile.Dirt).set(98, y, Tile.Dirt);

  // ---------------------------------------------------------------
  // THE WAKING RING — the arrival. A stone-floored circle inside five
  // weathered standing stones, flowers crowding the cracks. The same
  // five stones on the same world tiles as always. Nobody explains
  // it; the village only tends it.
  // ---------------------------------------------------------------
  b.fillEllipse(46, 48, 5, 4, Tile.StoneFloor);
  b.set(46, 44, Tile.Rock);
  b.set(42, 46, Tile.Rock);
  b.set(50, 45, Tile.Rock);
  b.set(42, 51, Tile.Rock);
  b.set(49, 52, Tile.Rock);
  b.setDetail(44, 45, Detail.Flowers).setDetail(48, 51, Detail.Flowers);
  b.setDetail(43, 49, Detail.Flowers).setDetail(47, 45, Detail.Flowers);
  b.setDetail(45, 52, Detail.Flowers).setDetail(50, 49, Detail.Flowers);
  b.setDetail(44, 42, Detail.Flowers).setDetail(48, 43, Detail.Flowers);
  b.setDetail(40, 48, Detail.Flowers).setDetail(51, 47, Detail.Flowers);
  b.setDetail(43, 47, Detail.Pebbles).setDetail(48, 49, Detail.Pebbles);
  b.setDetail(45, 46, Detail.Pebbles);
  b.set(41, 44, Tile.GrassTall).set(51, 51, Tile.GrassTall);
  b.set(40, 50, Tile.GrassTall);
  // Lamps frame the first steps east out of the Ring.
  b.set(52, 46, Tile.LampPost);
  b.set(52, 50, Tile.LampPost);

  // ---------------------------------------------------------------
  // WREN'S COTTAGE — the keeper's house, the closest roof to the
  // Ring. Her porch faces the stones: she knits there, and she has
  // seen every waker's first step for fifty years.
  // ---------------------------------------------------------------
  b.fillRect(32, 36, 9, 8, Tile.WoodFloor);
  b.outlineRect(32, 36, 9, 8, Tile.WallWood);
  b.set(36, 43, Tile.DoorwayWood); // south door onto the porch
  b.set(34, 43, Tile.WallWoodWindow).set(38, 43, Tile.WallWoodWindow);
  b.set(32, 39, Tile.WallWoodWindow).set(40, 39, Tile.WallWoodWindow);
  // The keeper's corner: shelf, the letters she never sent, her chair.
  b.set(33, 37, Tile.Bookshelf);
  b.set(34, 37, Tile.Lectern);
  b.setDetail(34, 36, Detail.Tapestry).setDetail(35, 36, Detail.Tapestry);
  b.set(35, 39, Tile.Chair); // the knitting chair, by the west window light
  b.setDetail(32, 42, Detail.WallBasket);
  b.set(33, 41, Tile.Hearth);
  b.set(36, 40, Tile.Table).set(37, 40, Tile.Chair);
  b.setDetail(36, 41, Detail.Rug).setDetail(37, 41, Detail.Rug);
  // Her bed: head north, foot at (38,38) — the night path's last tile.
  b.set(38, 37, Tile.Bed).set(38, 38, Tile.Bed);
  b.set(39, 37, Tile.Cabinet);
  b.setDetail(37, 38, Detail.RugRound);
  b.setDetail(36, 42, Detail.Doormat);
  // The porch, facing the stones.
  for (let x = 34; x <= 38; x++) b.set(x, 44, Tile.PorchDeck);
  b.set(35, 44, Tile.Chair);
  b.set(33, 44, Tile.FlowerBox).set(39, 44, Tile.FlowerBox);
  b.set(36, 45, Tile.Dirt); // the worn step
  b.setDetail(33, 43, trellisDetail(1));
  // The keeper's garden: a clipped hedge line shelters a flower bed
  // against the west wall — fifty years of tending, visible.
  for (let y = 37; y <= 43; y++) b.set(30, y, Tile.Hedge);
  b.setDetail(31, 38, Detail.Flowers).setDetail(31, 42, Detail.Flowers);
  // Her pennant line flies at the porch front, facing the stones —
  // the VILLAGE'S ONE LINE, the colors she sews for every village
  // day (a festival prop repeated stops being an occasion, so nobody
  // else flies one). West of the step so
  // the wakers' walk stays clear (a line prop is WIDE: give it clear
  // air east and west — a wall column swallows an end pole).
  b.set(34, 46, Tile.PennantLine);

  // ---------------------------------------------------------------
  // THE GREEN — the village's living room at the world's exact
  // center: the well, the notice board, benches, and the twins at a
  // dead run around all of it. The danger anchor (-64,48) is the
  // lane stone in front of the well.
  // ---------------------------------------------------------------
  b.fillRect(56, 43, 21, 5, Tile.StoneFloor);
  // The well — a REAL well now (the remade plan's promise, finally
  // kept): one honest wellhead where the old build stacked four blank
  // wall stones into a bunker. Same world tile the worldgen probe
  // pins at (-65,44).
  b.set(63, 44, Tile.Well);
  // One bench on the east half; the west half is Rowan's. Two seats
  // in talking distance is company — three in a row is a waiting room.
  b.set(70, 44, Tile.Bench);
  b.sign(68, 43, 'DAWNMEAD', ['The village that raises wakers.', 'Learn your hands, then the road.'], Tile.Signpost);
  b.setDetail(60, 46, Detail.Pebbles).setDetail(72, 44, Detail.Pebbles);
  b.set(56, 46, Tile.LampPost).set(76, 46, Tile.LampPost);
  b.set(58, 42, Tile.BannerPole).set(74, 42, Tile.BannerPole);
  // The green finds its civic voice. The bell calls supper and worse;
  // the board is where the village writes to itself; the town sign
  // stands between its two clipped sentries. NO fountain and NO
  // founder statue, ever: the well and the Ring are Dawnmead's heart,
  // and nobody founded the village that grew around the stones.
  b.set(60, 43, Tile.TownBell);
  b.set(62, 43, Tile.NoticeBoard);
  b.set(67, 43, Tile.TopiaryBall).set(69, 43, Tile.TopiaryBall);
  // Rowan's seat: the stone bench the village set when the old keeper
  // took his own advice and walked east. Nobody says it's his. It is.
  b.set(58, 45, Tile.StoneBench);
  // Two planters mark the lane approaches on the south edge — the
  // rhythm reads lamp, planter, open stone, planter, lamp. (The east
  // one keeps clear of Wick's standing post at (66,46): a child's
  // spot on the green is a placement too.)
  b.set(61, 46, Tile.StreetPlanter).set(71, 46, Tile.StreetPlanter);

  // ---------------------------------------------------------------
  // THE FIVE STONES — the inn, named for the only thing every guest
  // has in common. Common room west, four guest alcoves east: the
  // first bed a waker can call home. Gilly keeps the bar and the
  // road stories.
  // ---------------------------------------------------------------
  b.fillRect(48, 30, 15, 11, Tile.WoodFloor);
  b.outlineRect(48, 30, 15, 11, Tile.WallWood);
  b.set(48, 40, Tile.WallWoodDiagSE).set(62, 40, Tile.WallWoodDiagSW);
  b.set(54, 40, Tile.DoorwayWoodWide).set(55, 40, Tile.DoorwayWoodWide);
  b.set(51, 40, Tile.WallWoodWindow).set(59, 40, Tile.WallWoodWindow);
  b.set(48, 34, Tile.WallWoodWindow).set(62, 34, Tile.WallWoodWindow);
  b.set(52, 30, Tile.WallWoodWindow).set(58, 30, Tile.WallWoodWindow);
  // The bar: counter run, the keg behind it, cups on the back shelf,
  // and the stocked back-bar casework Gilly actually sells from.
  b.set(50, 33, Tile.Counter).set(51, 33, Tile.Counter).set(52, 33, Tile.Counter);
  b.set(49, 32, Tile.BrewKeg);
  b.set(49, 31, Tile.Cabinet).set(50, 31, Tile.Cabinet);
  b.set(51, 31, Tile.ShopShelf);
  b.set(53, 31, Tile.Barrel);
  // The common room: hearth on the west wall, two honest tables.
  b.set(48, 36, Tile.Hearth);
  b.set(52, 36, Tile.Table).set(53, 36, Tile.Table);
  b.set(51, 36, Tile.Chair).set(54, 36, Tile.Chair).set(52, 37, Tile.Chair);
  b.setDetail(52, 35, Detail.Rug).setDetail(53, 35, Detail.Rug);
  // Gilly's corner, behind the bar's end: her own small bed.
  b.set(49, 37, Tile.Bed).set(49, 38, Tile.Bed);
  b.setDetail(50, 38, Detail.RugRound);
  // The guest wing: a partition, an aisle, four claimable beds.
  for (let y = 31; y <= 39; y++) b.set(57, y, Tile.WallWood);
  b.set(57, 35, Tile.DoorwayWood);
  b.set(59, 32, Tile.Bed).set(59, 33, Tile.Bed);
  b.set(61, 32, Tile.Bed).set(61, 33, Tile.Bed);
  b.set(59, 36, Tile.Bed).set(59, 37, Tile.Bed);
  b.set(61, 36, Tile.Bed).set(61, 37, Tile.Bed);
  // The linen cabinet stands in the NW corner of the wing: the NE
  // corner would seal a one-tile pocket against the bed head (the
  // sealed-pocket law).
  b.set(58, 31, Tile.Cabinet);
  b.setDetail(60, 34, Detail.Rug).setDetail(60, 35, Detail.Rug);
  b.setDetail(54, 39, Detail.Doormat);
  b.sign(58, 41, 'THE FIVE STONES', ['Beds for wakers.', 'Claim one. Come back to it.']);
  b.set(54, 41, Tile.Dirt).set(55, 41, Tile.Dirt); // the worn threshold
  b.set(47, 41, Tile.LampPost);
  // An inn that works: the brewer's drop on the west service side
  // (never out back — the wall-shadow law) and a rail for whatever a
  // traveler rides in on. The door front carries sign, lamp, and
  // rail and nothing else — an inn welcomes with clear ground.
  b.set(46, 32, Tile.BarrelStack);
  b.set(52, 41, Tile.HitchingPost);

  // ---------------------------------------------------------------
  // THE FARMSTEAD — Brammel's family and Sorrel the drover: the
  // farmhouse, the coop, the big pasture, the tilled field, and the
  // stalls down by the ford where the beasts drink. The homestead
  // path starts here.
  // ---------------------------------------------------------------
  // The farmhouse: one long family room, beds along the north wall.
  b.fillRect(70, 8, 10, 8, Tile.WoodFloor);
  b.outlineRect(70, 8, 10, 8, Tile.WallWood);
  b.set(74, 15, Tile.DoorwayWood); // south door onto the farm walk
  b.set(72, 15, Tile.WallWoodWindow).set(77, 15, Tile.WallWoodWindow);
  b.set(70, 11, Tile.WallWoodWindow).set(79, 11, Tile.WallWoodWindow);
  b.set(71, 9, Tile.Bed).set(71, 10, Tile.Bed); // Brammel
  b.set(73, 9, Tile.Bed).set(73, 10, Tile.Bed); // Tansy
  b.set(75, 9, Tile.Bed).set(75, 10, Tile.Bed); // Wick
  b.set(78, 9, Tile.Bed).set(78, 10, Tile.Bed); // Sorrel boards here
  b.set(72, 9, Tile.Cabinet).set(76, 9, Tile.Cabinet);
  b.setDetail(74, 10, Detail.RugRound);
  b.set(71, 13, Tile.Hearth);
  b.set(74, 13, Tile.Table).set(75, 13, Tile.Table);
  b.set(73, 13, Tile.Chair).set(76, 13, Tile.Chair);
  b.set(78, 13, Tile.Basin);
  b.set(79, 14, Tile.GrainSacks); // the pantry corner, scoop parked
  b.setDetail(74, 12, Detail.Rug).setDetail(75, 12, Detail.Rug);
  b.setDetail(74, 14, Detail.Doormat);
  b.setDetail(71, 15, trellisDetail(0)); // ivy takes working houses
  // A farm mid-chore: the cart parked off the walk between house and
  // coop, feed sacks at the coop rail. (Wren's porch line is the
  // village's ONE pennant line — she sews the colors; nobody else
  // flies them on an ordinary day.)
  b.set(81, 16, Tile.HandCart);
  b.set(81, 10, Tile.GrainSacks);
  // The coop: fenced dirt, straw, west gate standing open. The hens
  // roam it and the long grass — the egg errand is honest work.
  b.fillRect(83, 9, 5, 4, Tile.Dirt);
  b.outlineRect(82, 8, 7, 6, Tile.Fence);
  b.set(82, 11, Tile.FenceGate);
  b.setDetail(84, 10, Detail.Straw).setDetail(86, 11, Detail.Straw);
  b.setDetail(85, 12, Detail.Straw);
  // The pasture: the big field, trough by the north rail, hay put up
  // against winter, the west gate standing open.
  b.outlineRect(68, 18, 19, 13, Tile.Fence);
  b.set(68, 24, Tile.FenceGate);
  b.set(72, 20, Tile.WaterTrough); // coopered and staved — a real trough, not a basin
  b.set(83, 20, Tile.HayBale).set(84, 21, Tile.HayBale);
  b.setDetail(75, 22, Detail.Straw).setDetail(80, 27, Detail.Straw);
  b.setDetail(71, 26, Detail.Straw);
  b.set(71, 29, Tile.GrassTall).set(75, 29, Tile.GrassTall);
  b.set(79, 29, Tile.GrassTall).set(83, 29, Tile.GrassTall);
  // The long grass outside the rail, where the stray eggs end up.
  b.set(70, 32, Tile.GrassTall).set(66, 28, Tile.GrassTall);
  b.set(84, 32, Tile.GrassTall);
  // The tilled field: two crop rows in, one resting, the scarecrow
  // minding all three. Brammel's whole horizon.
  b.fillRect(70, 33, 7, 6, Tile.Tilled);
  b.set(71, 34, Tile.WheatRipe).set(72, 34, Tile.WheatMid).set(73, 34, Tile.WheatRipe);
  b.set(74, 34, Tile.WheatMid).set(75, 34, Tile.WheatRipe);
  b.set(71, 36, Tile.CarrotRipe).set(72, 36, Tile.CarrotMid).set(73, 36, Tile.CarrotRipe);
  b.set(74, 36, Tile.CarrotMid).set(75, 36, Tile.CarrotRipe);
  b.set(73, 32, Tile.Scarecrow);
  b.set(77, 33, Tile.CompostBin);
  // Ottery's house stands between field and bench yard (his room; the
  // shelf inside keeps every waker's first mangled craft).
  b.fillRect(78, 33, 6, 7, Tile.WoodFloor);
  b.outlineRect(78, 33, 6, 7, Tile.WallWood);
  b.set(80, 39, Tile.DoorwayWood); // south door onto the bench yard
  b.set(82, 39, Tile.WallWoodWindow).set(78, 36, Tile.WallWoodWindow);
  b.set(79, 34, Tile.Bed).set(79, 35, Tile.Bed);
  b.set(82, 34, Tile.Bookshelf); // the shelf of first things
  b.set(82, 37, Tile.Hearth);
  b.setDetail(80, 35, Detail.RugRound);
  b.setDetail(80, 38, Detail.Doormat);

  // ---------------------------------------------------------------
  // THE BENCH YARD — Ottery's open workshop on the lane: bench, saw,
  // carving stand, and the forge corner glowing at the lane's edge.
  // Every core trade is sampleable before a waker ever sees
  // Amberford. The Scrap Crag south-west feeds the furnace.
  // ---------------------------------------------------------------
  b.fillRect(77, 40, 10, 7, Tile.Dirt);
  b.set(79, 42, Tile.Workbench);
  b.set(82, 42, Tile.Sawhorse);
  b.set(85, 42, Tile.CarvingBench);
  b.set(77, 41, Tile.Stump); // the log that feeds the sawhorse
  b.set(78, 41, Tile.LumberRack); // stump to rack to sawhorse — timber flows east
  b.set(86, 41, Tile.CrateGoods);
  // The forge corner: one furnace, one anvil, facing the lane — and
  // the working triangle between them. Quench beside the anvil,
  // bellows at the fire's shoulder, the ingot rack showing every
  // waker what a bar of bronze is FOR before Amberford ever asks.
  b.set(84, 45, Tile.Furnace);
  b.set(82, 45, Tile.Anvil);
  b.set(83, 45, Tile.QuenchTrough);
  b.set(85, 45, Tile.SmithBellows);
  b.set(86, 44, Tile.IngotRack);
  b.setDetail(79, 43, Detail.Sawdust).setDetail(82, 43, Detail.Sawdust);
  b.setDetail(85, 43, Detail.Sawdust).setDetail(80, 42, Detail.Sawdust);
  b.setDetail(83, 44, Detail.Pebbles);
  b.sign(78, 46, "OTTERY'S YARD", ['Bench, saw, forge.', 'Make your first thing.'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE COOKHOUSE — Berrit's hall: her walled cot on the west end,
  // the open hall east of it under timber posts, the long table the
  // whole village eats at, and the supper fire on its court. The
  // hearth path starts here.
  // ---------------------------------------------------------------
  b.fillRect(70, 52, 5, 7, Tile.WoodFloor);
  b.outlineRect(70, 52, 5, 7, Tile.WallWood);
  b.set(74, 55, Tile.DoorwayWood); // east door into the hall
  b.set(70, 55, Tile.WallWoodWindow).set(72, 58, Tile.WallWoodWindow);
  b.set(71, 53, Tile.Bed).set(71, 54, Tile.Bed);
  b.set(71, 56, Tile.Cabinet);
  b.set(73, 53, Tile.Basin);
  b.set(73, 57, Tile.HerbRack); // the bank's forage, hung heads-down
  b.setDetail(72, 54, Detail.RugRound);
  b.setDetail(73, 55, Detail.Doormat);
  // The open hall: posts, stone floor, stations on the north row.
  b.fillRect(75, 52, 6, 7, Tile.StoneFloor);
  b.set(76, 52, Tile.TimberPost).set(80, 52, Tile.TimberPost);
  b.set(76, 58, Tile.TimberPost).set(80, 58, Tile.TimberPost);
  b.set(77, 52, Tile.Hearth);
  b.set(79, 52, Tile.CookPot);
  // The long table, benches both sides, aisles clear at both ends.
  b.set(76, 55, Tile.Table).set(77, 55, Tile.Table).set(78, 55, Tile.Table).set(79, 55, Tile.Table);
  b.set(76, 54, Tile.Bench).set(77, 54, Tile.Bench).set(78, 54, Tile.Bench).set(79, 54, Tile.Bench);
  b.set(76, 56, Tile.Bench).set(77, 56, Tile.Bench).set(78, 56, Tile.Bench).set(79, 56, Tile.Bench);
  // The baking line on the hall's north face: the brick oven Berrit
  // fires before dawn, flour at its left hand, fuel at its right.
  b.set(78, 51, Tile.BreadOven);
  b.set(76, 51, Tile.GrainSacks);
  b.set(80, 51, Tile.Woodpile);
  // The smoke yard east of the hall: spit, block, and smoker in a
  // working row, downwind. The cleaver stands where she left it.
  b.set(82, 53, Tile.MeatSpit);
  b.set(82, 55, Tile.ButcherBlock);
  b.set(82, 57, Tile.Smoker);
  b.set(81, 59, Tile.Barrel);
  b.sign(73, 59, 'THE LONG TABLE', ['Berrit feeds all comers.', 'Wash your hands.'], Tile.Signpost);
  // The supper fire on its court — the ONE campfire, where the
  // cooking lesson happens and the village gathers at dusk.
  b.fillEllipse(75, 62, 3, 2, Tile.Dirt);
  b.set(74, 61, Tile.Campfire);
  b.set(72, 63, Tile.Bench).set(77, 63, Tile.Bench);
  b.setDetail(75, 61, Detail.Pebbles).setDetail(73, 62, Detail.Pebbles);

  // ---------------------------------------------------------------
  // THE STALLS — Sorrel's drover yard by the ford, where the beasts
  // water. Rails, hay, the feed trough, and the one stall door every
  // tamed friend in the world walks through first.
  // ---------------------------------------------------------------
  for (let x = 84; x <= 90; x++) b.set(x, 52, Tile.Fence);
  for (let y = 53; y <= 57; y++) b.set(84, y, Tile.Fence);
  b.set(87, 54, Tile.BeastPen);
  b.set(85, 53, Tile.FeedTrough);
  b.set(89, 53, Tile.HayBale);
  b.setDetail(86, 55, Detail.Straw).setDetail(88, 56, Detail.Straw);
  b.setDetail(85, 56, Detail.Straw);
  b.sign(86, 51, 'THE STALLS', ["Sorrel's yard. Speak soft.", 'Beasts at the rail.'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE DRILL YARD — three teachers, three schools, one ground.
  // Halla's dummies, Rill's fenced range with its straw butts, and
  // Varn's spark circle with its scorched stones. The lodge keeps
  // the wards' bunks and Halla's.
  // ---------------------------------------------------------------
  b.fillRect(46, 56, 16, 10, Tile.Dirt);
  b.set(49, 58, Tile.TargetDummy).set(53, 58, Tile.TargetDummy).set(57, 58, Tile.TargetDummy);
  b.set(47, 56, Tile.WeaponRack);
  b.set(48, 56, Tile.Grindstone); // the yard keeps its own edges
  b.set(60, 56, Tile.ToolRack);
  b.set(61, 64, Tile.Bench);
  b.setDetail(51, 60, Detail.Straw).setDetail(56, 62, Detail.Straw);
  b.setDetail(48, 63, Detail.Pebbles);
  b.sign(50, 54, 'THE DRILL YARD', ['Halla keeps the blade,', 'Rill the bow, Varn the spark.'], Tile.Signpost);
  b.set(45, 55, Tile.LampPost);
  // The lodge: stone, north door onto the yard, four bunks and the
  // duty table. The wards hot-bunk; there is always a body walking.
  b.fillRect(44, 68, 9, 8, Tile.StoneFloor);
  b.outlineRect(44, 68, 9, 8, Tile.WallStone);
  b.set(48, 68, Tile.DoorwayStone);
  b.set(46, 68, Tile.WallStoneWindow).set(50, 68, Tile.WallStoneWindow);
  b.set(44, 72, Tile.WallStoneWindow).set(52, 72, Tile.WallStoneWindow);
  b.set(45, 69, Tile.Bed).set(45, 70, Tile.Bed); // Halla
  b.set(49, 69, Tile.Bed).set(49, 70, Tile.Bed); // ward bunk
  b.set(51, 69, Tile.Bed).set(51, 70, Tile.Bed); // ward bunk
  b.set(47, 72, Tile.Bed).set(47, 73, Tile.Bed); // the hot bunk
  b.set(48, 70, Tile.Table); // the duty table
  b.set(51, 74, Tile.WeaponRack);
  b.set(45, 74, Tile.Hearth);
  b.set(50, 74, Tile.Crate);
  b.set(43, 74, Tile.Woodpile); // the watch's winter, ranked at the west wall
  b.setDetail(48, 71, Detail.Rug);
  b.setDetail(48, 69, Detail.Doormat);
  // The archery range: fenced so nobody wanders behind the butts.
  b.outlineRect(54, 68, 13, 7, Tile.Fence);
  b.set(54, 71, Tile.FenceGate); // west gate, standing open
  b.set(64, 70, Tile.HayBale).set(64, 72, Tile.HayBale); // the butts
  b.set(60, 71, Tile.TargetDummy); // the mid-range mark
  b.setDetail(57, 70, Detail.Straw).setDetail(62, 73, Detail.Straw);
  // Rill's hut, south of the range, door on the range side.
  b.fillRect(60, 77, 6, 6, Tile.WoodFloor);
  b.outlineRect(60, 77, 6, 6, Tile.WallWood);
  b.set(62, 77, Tile.DoorwayWood);
  b.set(64, 77, Tile.WallWoodWindow).set(60, 80, Tile.WallWoodWindow);
  b.set(64, 78, Tile.Bed).set(64, 79, Tile.Bed);
  b.set(61, 78, Tile.Cabinet);
  b.set(61, 81, Tile.Hearth);
  b.setDetail(63, 79, Detail.RugRound);
  b.setDetail(62, 78, Detail.Doormat);
  b.set(67, 79, Tile.Stump); // the whittling stump
  b.setDetail(67, 80, Detail.Sawdust);
  // Varn's spark circle: old stones, two braziers, the scorched
  // ground where the lessons land, and the dummy that takes them.
  b.fillEllipse(40, 62, 3, 2, Tile.StoneFloor);
  b.set(38, 60, Tile.Brazier).set(42, 60, Tile.Brazier);
  b.set(39, 63, Tile.Dirt).set(41, 62, Tile.Dirt); // scorch
  b.set(40, 65, Tile.TargetDummy);
  b.setDetail(40, 63, Detail.Pebbles);
  // Varn's hut, north of the circle, door east toward the yard.
  b.fillRect(34, 52, 7, 6, Tile.WoodFloor);
  b.outlineRect(34, 52, 7, 6, Tile.WallWood);
  b.set(40, 55, Tile.DoorwayWood);
  b.set(37, 52, Tile.WallWoodWindow).set(34, 55, Tile.WallWoodWindow);
  b.set(35, 53, Tile.Bed).set(35, 54, Tile.Bed);
  b.set(38, 53, Tile.Bookshelf).set(39, 53, Tile.Bookshelf); // half-read, all open
  b.set(35, 56, Tile.Hearth);
  b.setDetail(36, 54, Detail.RugRound);
  b.setDetail(39, 55, Detail.Doormat);

  // ---------------------------------------------------------------
  // THE COPSE — Alder's managed woodlot: planted stands, honest
  // stumps, his hut among the trunks, and the Scrap Crag on its
  // southern hem where Ottery's copper comes out of the ground.
  // ---------------------------------------------------------------
  b.set(10, 58, Tile.TreeOak).set(15, 57, Tile.TreeOak).set(21, 58, Tile.TreeOak);
  b.set(26, 59, Tile.TreeOak).set(9, 64, Tile.TreeOak).set(24, 64, Tile.TreeOak);
  b.set(28, 68, Tile.TreeOak).set(11, 70, Tile.TreeOak).set(17, 70, Tile.TreeOak);
  b.set(23, 72, Tile.TreeOak).set(9, 76, Tile.TreeOak).set(15, 77, Tile.TreeOak);
  b.set(21, 78, Tile.TreeOak).set(27, 76, Tile.TreeOak);
  b.set(12, 82, Tile.Tree).set(18, 84, Tile.Tree).set(8, 86, Tile.Tree);
  b.set(13, 60, Tile.Stump).set(20, 66, Tile.Stump).set(10, 73, Tile.Stump);
  b.set(25, 80, Tile.Stump);
  b.setDetail(14, 62, Detail.Mushroom).setDetail(22, 75, Detail.Mushroom);
  b.setDetail(11, 61, Detail.Pebbles).setDetail(19, 72, Detail.Pebbles);
  // Alder's hut, door east toward the village.
  b.fillRect(12, 62, 7, 6, Tile.WoodFloor);
  b.outlineRect(12, 62, 7, 6, Tile.WallWood);
  b.set(18, 64, Tile.DoorwayWood);
  b.set(18, 66, Tile.WallWoodWindow).set(15, 62, Tile.WallWoodWindow);
  b.set(13, 63, Tile.Bed).set(13, 64, Tile.Bed);
  b.set(13, 66, Tile.Hearth);
  b.set(16, 63, Tile.Cabinet);
  b.setDetail(14, 64, Detail.RugRound);
  b.setDetail(17, 64, Detail.Doormat);
  b.set(16, 69, Tile.Woodpile); // the trade itself: cordwood ranked at the south wall
  b.sign(20, 65, 'THE COPSE', ['Take the marked ones.', 'A stand outlives its keeper.'], Tile.Signpost);
  // The Scrap Crag: copper and tin in the open, pick-height.
  b.set(23, 81, Tile.Rock).set(28, 85, Tile.Rock);
  b.set(25, 82, Tile.RockCopper).set(22, 84, Tile.RockCopper);
  b.set(27, 83, Tile.RockTin).set(29, 80, Tile.RockTin);
  b.setDetail(24, 83, Detail.Pebbles).setDetail(26, 81, Detail.Pebbles);
  b.setDetail(28, 84, Detail.Pebbles);
  b.sign(25, 86, 'THE SCRAP CRAG', ['Copper and tin, honest seams.', "Ottery's furnace is hungry."], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE ORCHARD — planted lines behind a clipped hedgerow in the
  // northwest, the living arch onto the long walk that ends at the
  // Ring. The one place in Dawnmead bounded by hedge, not rail:
  // livestock gets post-and-timber, but an orchard is a GARDEN, and
  // fifty years of wakers learning shears have kept this one square.
  // ---------------------------------------------------------------
  b.outlineRect(18, 8, 23, 17, Tile.Hedge);
  b.set(28, 24, Tile.HedgeGate); // the living arch, wicket swung aside
  b.set(27, 23, Tile.TopiarySpire).set(29, 23, Tile.TopiarySpire); // the gate's honor guard
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      b.set(21 + col * 3 + (row % 2), 11 + row * 3, Tile.TreeOak);
    }
  }
  b.set(19, 23, Tile.CrateStack).set(20, 23, Tile.Barrel); // the harvest corner, mid-picking
  b.sign(30, 25, 'THE ORCHARD', ["Windfalls are anybody's.", 'Shake nothing. Ask Alder.'], Tile.Signpost);
  b.setDetail(25, 14, Detail.Flowers).setDetail(33, 19, Detail.Flowers);
  b.setDetail(29, 21, Detail.Flowers);

  // ---------------------------------------------------------------
  // THE BROOK — down from the north woods, under the lane bridge,
  // past the crab bank, over the wading ford, and out the south hem.
  // Shallows line every reach so nothing ever traps a waker on the
  // wrong bank.
  // ---------------------------------------------------------------
  for (let y = 0; y < 96; y++) {
    const cx = brookX(y);
    b.set(cx - 1, y, Tile.WaterShallow);
    b.set(cx, y, Tile.Water);
    b.set(cx + 1, y, Tile.WaterShallow);
  }
  // The lane bridge: ONE rectangle centered on the brook at the
  // lane's middle row (spans-are-rectangles law).
  {
    const bcx = brookX(48);
    for (let y = 47; y <= 49; y++) {
      for (let x = bcx - 2; x <= bcx + 2; x++) b.set(x, y, Tile.Bridge);
    }
  }
  b.set(90, 46, Tile.BannerPole).set(90, 50, Tile.BannerPole);
  // The ford: knee-deep the whole way across — the honest shortcut
  // between the supper fire and the granary meadow.
  for (let y = 70; y <= 72; y++) b.set(brookX(y), y, Tile.WaterShallow);
  b.set(86, 71, Tile.Dirt).set(87, 71, Tile.Dirt).set(88, 71, Tile.Dirt);
  b.set(95, 71, Tile.Dirt).set(96, 71, Tile.Dirt);
  for (let x = 97; x <= 103; x++) b.set(x, 69, Tile.Dirt); // on to the granary
  b.setDetail(87, 70, Detail.Pebbles).setDetail(95, 72, Detail.Pebbles);
  // Fishing spots where the water sounds busiest.
  b.set(94, 10, Tile.FishingSpot);
  b.set(91, 24, Tile.FishingSpot);
  b.set(91, 66, Tile.FishingSpot);
  // Willows lean over the water, clear of every path and node.
  b.set(94, 33, Tile.TreeWillow);
  b.set(89, 62, Tile.TreeWillow);
  b.set(95, 84, Tile.TreeWillow);

  // THE BERRY BANKS — the foraging lesson, on the near bank south of
  // the bridge where Berrit sends you: berries, the tall fibre
  // plants, and sageroot, each standing in open sun.
  b.set(87, 62, Tile.BerryBush);
  b.set(88, 59, Tile.BerryBush);
  b.set(85, 64, Tile.BerryBush);
  b.set(87, 66, Tile.BerryBush);
  b.set(84, 68, Tile.BerryBush);
  b.set(82, 64, Tile.BerryBush);
  b.set(83, 61, Tile.FibrePlant);
  b.set(86, 68, Tile.FibrePlant);
  b.set(84, 59, Tile.WildSagewort);
  b.set(82, 67, Tile.WildSagewort);
  // A last pair upstream for the wanderers.
  b.set(88, 40, Tile.BerryBush);
  b.set(87, 37, Tile.WildSagewort);

  // ---------------------------------------------------------------
  // THE CRAB BANK — the brook's east shore spreads into sand where
  // the mudcrabs sun themselves in the open. Weir's pier noses into
  // the water at the bank's head; his racks dry the catch.
  // ---------------------------------------------------------------
  b.fillEllipse(102, 30, 8, 7, Tile.Sand);
  b.fillEllipse(99, 39, 5, 4, Tile.Sand);
  b.fillEllipse(101, 28, 2, 1, Tile.WaterShallow); // the warm pool
  b.fillEllipse(104, 36, 2, 1, Tile.WaterShallow); // and the cold one
  b.set(96, 25, Tile.GrassTall).set(107, 26, Tile.GrassTall);
  b.set(109, 33, Tile.GrassTall).set(95, 37, Tile.GrassTall);
  b.set(103, 42, Tile.GrassTall).set(97, 43, Tile.GrassTall);
  b.setDetail(99, 31, Detail.Pebbles).setDetail(104, 33, Detail.Pebbles);
  b.setDetail(98, 27, Detail.Pebbles).setDetail(102, 40, Detail.Pebbles);
  b.sign(100, 45, 'THE CRAB BANK', ['Mudcrabs sun on the sand.', 'They pinch. Pinch first.'], Tile.Signpost);
  // Weir's pier: planks off the east bank into the current.
  for (let x = 91; x <= 95; x++) b.set(x, 22, Tile.Dock);
  // Weir's hut and the drying yard above the bank.
  b.fillRect(104, 14, 7, 6, Tile.WoodFloor);
  b.outlineRect(104, 14, 7, 6, Tile.WallWood);
  b.set(107, 19, Tile.DoorwayWood);
  b.set(105, 19, Tile.WallWoodWindow).set(110, 17, Tile.WallWoodWindow);
  b.set(105, 15, Tile.Bed).set(105, 16, Tile.Bed);
  b.set(108, 15, Tile.Cabinet);
  b.set(109, 18, Tile.Hearth);
  b.setDetail(106, 16, Detail.RugRound);
  b.setDetail(107, 18, Detail.Doormat);
  b.set(101, 17, Tile.DryingRack).set(101, 20, Tile.DryingRack);
  b.set(98, 19, Tile.Barrel);
  b.set(97, 22, Tile.CrateStack); // the tackle stacked at the pier head

  // ---------------------------------------------------------------
  // THE OLD GRANARY — the roofless ruin in the southeast meadow.
  // Hobb's people stored grain here before the family took the road
  // to Amberford market; the rats hold it now, in open daylight,
  // visible from the lane. The village chest waits inside for
  // whoever thins them.
  // ---------------------------------------------------------------
  b.fillRect(107, 59, 8, 6, Tile.Dirt);
  b.outlineRect(106, 58, 10, 8, Tile.WallStone);
  b.set(110, 58, Tile.Grass); // the doorway went with the roof
  b.set(108, 65, Tile.Grass).set(109, 65, Tile.Grass); // the south wall sags open
  b.set(115, 61, Tile.Grass); // and the east one too
  b.set(107, 59, Tile.Crate);
  b.set(114, 64, Tile.Barrel);
  b.set(112, 62, Tile.ChestWood);
  b.setDetail(109, 61, Detail.Straw).setDetail(111, 63, Detail.Straw);
  b.setDetail(113, 60, Detail.Straw).setDetail(108, 63, Detail.Straw);
  // The meadow the rats claimed: long grass, spilled grain, the old
  // fence leaning into it.
  b.set(104, 67, Tile.Fence).set(105, 67, Tile.Fence);
  b.set(117, 66, Tile.Stump);
  b.set(103, 60, Tile.GrassTall).set(105, 64, Tile.GrassTall);
  b.set(117, 62, Tile.GrassTall).set(116, 57, Tile.GrassTall);
  b.set(104, 56, Tile.GrassTall).set(108, 68, Tile.GrassTall);
  b.set(113, 68, Tile.GrassTall).set(118, 65, Tile.GrassTall);
  b.setDetail(106, 66, Detail.Mushroom).setDetail(115, 67, Detail.Straw);
  b.setDetail(110, 56, Detail.Pebbles);
  b.sign(108, 52, 'THE OLD GRANARY', ['Rats took the roof year before', 'last. Wakers: have at them.'], Tile.Signpost);

  // ---------------------------------------------------------------
  // WAYS OUT — every road tells you what it is before you take it.
  // ---------------------------------------------------------------
  b.sign(67, 8, "HUNTERS' TRAIL", ['No lamps this way.', 'Wolves den in the north woods.'], Tile.Signpost);
  b.sign(101, 88, 'THE OLD ROAD', ['Kingsdelf country, unlit.', 'Not for new feet.'], Tile.Signpost);
  b.sign(118, 45, 'THE FIRST ROAD', ['Amberford, a day east.', 'Keep to the lamps.'], Tile.Signpost);
  // Lane lamps, Ring to hem — the walk east never feels like leaving
  // safety, because it isn't.
  b.set(58, 50, Tile.LampPost).set(72, 50, Tile.LampPost);
  b.set(80, 46, Tile.LampPost);
  b.set(98, 46, Tile.LampPost).set(106, 50, Tile.LampPost);
  b.set(114, 46, Tile.LampPost).set(122, 50, Tile.LampPost);
  // The send-off seat: a stone bench between the last lamps, facing
  // the lane. Every waker who ever left sat here a minute first.
  b.set(110, 46, Tile.StoneBench);

  // ---------------------------------------------------------------
  // THE QUIET QUARTERS — every corner holds a vignette, no voids.
  // ---------------------------------------------------------------
  // The rocky hem northwest of the orchard.
  b.set(6, 18, Tile.Rock).set(9, 22, Tile.Rock).set(4, 25, Tile.Rock);
  b.setDetail(7, 20, Detail.Mushroom).setDetail(5, 23, Detail.Pebbles);
  b.setDetail(8, 24, Detail.Pebbles);
  // The Ring meadow west: open wildflower ground, a pair of old oaks,
  // and nothing else — the first thing a waker sees is soft distance.
  b.set(14, 42, Tile.TreeOak).set(22, 52, Tile.TreeOak);
  b.setDetail(10, 40, Detail.Flowers).setDetail(17, 47, Detail.Flowers);
  b.setDetail(25, 44, Detail.Flowers).setDetail(13, 51, Detail.Flowers);
  b.setDetail(20, 38, Detail.Flowers).setDetail(8, 46, Detail.Flowers);
  b.set(11, 45, Tile.GrassTall).set(19, 43, Tile.GrassTall);
  b.set(24, 49, Tile.GrassTall);
  // The south meadow between the yard and the hem: open grass where
  // the wards' dusk round turns.
  b.set(40, 82, Tile.GrassTall).set(46, 85, Tile.GrassTall);
  b.set(52, 82, Tile.GrassTall).set(44, 89, Tile.GrassTall);
  b.set(50, 88, Tile.TreeOak);
  b.setDetail(42, 84, Detail.Flowers).setDetail(48, 87, Detail.Flowers);
  // The northeast wood across the brook, thick toward the corner.
  b.set(112, 6, Tile.TreeOak).set(118, 10, Tile.TreeOak);
  b.set(122, 16, Tile.TreeOak);
  b.setDetail(115, 8, Detail.Mushroom);

  // Meadow life.
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.05);
  b.scatterDetail(Detail.Tuft, 0.06);

  // Edge woods (hand-placed feel: dense at the rim, thinning inward),
  // keeping every worked place open.
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 128; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 48) <= 4 && x >= 36) continue; // the lane breathes
      if (x >= 30 && x <= 92 && y >= 26 && y <= 66) continue; // the village core is tended land
      if (x >= 16 && x <= 43 && y >= 6 && y <= 27) continue; // the orchard and its walk
      if (x >= 26 && x <= 31 && y >= 24 && y <= 46) continue; // the orchard walk south
      if (x >= 66 && x <= 92 && y >= 4 && y <= 48) continue; // the farmstead
      if (x >= 62 && x <= 68 && y <= 46) continue; // the hunters' trail
      if (x >= 42 && x <= 70 && y >= 52 && y <= 84) continue; // the drill yard and huts
      if (x >= 6 && x <= 32 && y >= 54 && y <= 88) continue; // the copse is authored
      if (x >= 68 && x <= 92 && y >= 50 && y <= 74) continue; // cookhouse, stalls, berry banks
      if (x >= 92 && x <= 114 && y >= 14 && y <= 46) continue; // the crab bank and pier
      if (x >= 100 && x <= 122 && y >= 50 && y <= 72) continue; // the granary meadow
      if (x >= 94 && x <= 101 && y >= 48) continue; // the old-road spur
      if (x >= 82 && x <= 98 && y >= 66 && y <= 76) continue; // the ford crossing
      if (x >= 0 && x <= 30 && y >= 34 && y <= 54) continue; // the Ring meadow stays open
      const edge = Math.min(x, y, 127 - x, 95 - y);
      const density = edge < 4 ? 0.35 : edge < 9 ? 0.12 : 0.008;
      if (meadRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // ---------------------------------------------------------------
  // The animals and the lessons: penned hens and herd beasts, the
  // granary rats and the bank crabs — the village's whole syllabus
  // of first combat and first produce, all of it in the open.
  // ---------------------------------------------------------------
  b.npcSpawn('chicken', 85, 10.5, 1.8, 5);
  b.npcSpawn('cow', 74.5, 23.5, 3, 2);
  b.npcSpawn('sheep', 80.5, 26.5, 2.5, 3);
  b.npcSpawn('rat', 110.5, 61.5, 2, 3);
  b.npcSpawn('rat', 106.5, 67.5, 3, 2);
  b.npcSpawn('rat', 117.5, 59.5, 3, 2);
  b.npcSpawn('mudcrab', 101.5, 30.5, 3, 3);
  b.npcSpawn('mudcrab', 98.5, 39.5, 2, 2);

  // ---------------------------------------------------------------
  // The villagers — sixteen lives, each keeping the hours of a
  // routine whose coordinates hang off these posts (the
  // post-is-the-origin law: move a post, and the life moves).
  // ---------------------------------------------------------------
  // Wren waits beside the Ring for wakers, as Rowan asked her to.
  b.actor('keeper_wren', 44.5, 46.5, Math.PI / 2, 'wren_hours');
  // Halla drills the yard; the dummies stand where she can see them.
  b.actor('yardmaster_halla', 52.5, 60.5, -Math.PI / 2, 'halla_rounds');
  // Rill keeps the range, shooting east at the straw butts.
  b.actor('fletcher_rill', 56.5, 71.5, 0, 'rill_hours');
  // Varn keeps the spark circle and loses whole afternoons in it.
  b.actor('sparkwright_varn', 40.5, 61.5, Math.PI / 2, 'varn_hours');
  // Alder works the copse at a tree's own pace.
  b.actor('forester_alder', 21.5, 68.5, Math.PI / 2, 'alder_hours');
  // Berrit owns the cookhouse the way captains own ships.
  b.actor('cook_berrit', 78.5, 53.5, -Math.PI / 2, 'berrit_hours');
  // Ottery taps away at the bench between the saw and the forge.
  b.actor('wright_ottery', 79.5, 43.5, -Math.PI / 2, 'ottery_hours');
  // Gilly keeps the bar at the Five Stones.
  b.actor('innkeep_gilly', 51.5, 32.5, Math.PI / 2, 'gilly_hours');
  // Weir is on his pier. Weir is always on his pier.
  b.actor('angler_weir', 93.5, 22.5, Math.PI / 2, 'weir_hours');
  // Brammel minds the field and the weather, in that order.
  b.actor('farmer_brammel', 73.5, 40.5, -Math.PI / 2, 'brammel_hours');
  // Sorrel keeps the stalls and talks to the animals more than the
  // owners.
  b.actor('drover_sorrel', 86.5, 55.5, Math.PI, 'sorrel_hours');
  // The twins orbit the green at a dead run until bedtime.
  b.actor('twin_tansy', 60.5, 44.5, 0, 'tansy_scamp');
  b.actor('twin_wick', 66.5, 46.5, Math.PI, 'wick_scamp');
  // THE VALE WARDS — Halla's rota, three bodies and one hot bunk:
  // the bridge by day, the green by night, the granary meadow at
  // dusk. There is always a lantern moving somewhere in Dawnmead.
  b.actor('dawnmead_ward', 90.5, 48.5, 0, 'dawn_ward_day');
  b.actor('dawnmead_ward', 66.5, 45.5, Math.PI / 2, 'dawn_ward_night');
  b.actor('dawnmead_ward', 104.5, 52.5, Math.PI / 2, 'dawn_ward_dusk');

  b.spawn(46.5, 48.5);
  return b.build();
}

/** Stable per-tile randomness so the village is identical every boot. */
function meadRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x2f61a3b7;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
