import {
  Detail,
  Tile,
  awningTile,
  bannerPoleTile,
  bannerStandTile,
  bracketSignDetail,
  herbBundlesDetail,
  pennantDetail,
  sillHerbsDetail,
  trellisDetail,
  wallArmsDetail,
  wallBannerDetail,
} from '@arx/shared';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Dawnmead — the village that raises wakers. THE DAWN COMES OPEN
 * rebuild (docs/dawnmead-open-plan.md is the spec; this file is the
 * ground). It replaces the ENVELOPE and the MAP of THE DAWN REMADE;
 * that plan's fiction, cast, quest slate and dialogue stand unchanged.
 *
 * 192x224 at world (-160,-64) — three and a half times the old ground,
 * and the first Dawnmead rect whose CENTRE is the danger anchor
 * (-64,48) exactly. Local = world + (160,64).
 *
 * A waker opens their eyes inside SEVEN standing stones in an empty
 * meadow, walks the keeper's way past Wren's porch, and comes out on
 * the green. From the well four signed ways leave: north to the
 * homestead and the orchard, south to the proving ground and its three
 * schools, east to the works, the water and the First Road, west back
 * to the stones. Nothing shares a field with anything else any more.
 *
 * LAWS THIS FILE KEEPS (move nothing without updating the web):
 * - Spawn (78.5,112.5) = world (-81.5,48.5), UNCHANGED across both
 *   rebuilds (worldgen.test pins the world coords; the rescue law and
 *   every old character's respawn depend on it).
 * - SEVEN standing stones. The five that have always stood keep their
 *   world tiles; two were added west and east to close the ring.
 * - Lane rows 111-113 = world 47-49, reaching x191 as Path (first_road
 *   starts at world (32,48)); the hunters' trail leaves the north hem
 *   at x60 (world -100) and the old road leaves the south hem at x108
 *   (world -52). The geography pts agree.
 * - ONE Campfire, ONE Workbench, ONE ChestWood, ONE Furnace, ONE
 *   Anvil, ONE CookPot, ONE BeastPen — content.test counts them
 *   exactly. TWO RockCopper, TWO RockTin.
 * - Routine geometry hangs off actor posts (post-is-the-origin law).
 *   Every named villager's night path ends lie:true on the FOOT tile
 *   of a 2-tile head-north bed run; every lie/sit stop stages on a
 *   walkable CARDINAL neighbour first (the cardinal-stand law).
 * - Gates are authored OPEN (NPCs cannot work latches).
 * - The brook touches BOTH n/s borders (edge-harmony outflow law).
 * - The village and the lane stay predator-free (corridor law).
 *   Rats and crabs fight in the OPEN — nothing hides behind a wall.
 * - Occlusion law: tall art paints over what stands NORTH of it, so
 *   nothing tall sits on the 1-2 rows south of doors, stations, signs,
 *   forage nodes, or actor posts.
 * - The awning host law: the tile NORTH of every awning is a wall, a
 *   window wall, or a doorway.
 * - NO fountain and NO founder statue, ever.
 */
export function buildDawnmead(): ZoneDef {
  const b = new ZoneBuilder('dawnmead', 'Dawnmead', { x: -160, y: -64 }, 192, 224, Tile.Grass);

  /** The brook's centre column at a row (shared by every water read). */
  const brookX = (y: number) => 160 + Math.round(Math.sin((y - 112) * 0.1) * 2);

  // ================================================================
  // STREETS FIRST. One honest lane west-to-east from the Waking Ring
  // to the First Road, and the working ways that grew off it.
  // ================================================================
  b.path({ x: 86, y: 112 }, { x: 191, y: 112 }, 3);

  // THE KEEPER'S WAY is the lane itself; these are the rest.
  // The homestead way: the green's north mouth, past the inn's
  // forecourt, up the pasture's east rail to the farm door.
  for (let y = 46; y <= 106; y++) b.set(120, y, Tile.Dirt).set(121, y, Tile.Dirt);
  // The cottage lane: west off the homestead way to the three roofs.
  for (let x = 72; x <= 119; x++) b.set(x, 93, Tile.Dirt);
  // The orchard walk: the cottage lane's west end, north along the
  // orchard's east hedge to the living arch, and on to the trail head.
  for (let y = 26; y <= 92; y++) b.set(96, y, Tile.Dirt);
  for (let x = 93; x <= 95; x++) b.set(x, 52, Tile.Dirt);
  // The hunters' trail: single-file dirt off the orchard walk, west
  // along the orchard's head and out the north hem at x60. No lamps.
  for (let x = 60; x <= 95; x++) b.set(x, 26, Tile.Dirt);
  for (let y = 0; y <= 25; y++) b.set(60, y, Tile.Dirt);
  // The proving way: south off the green's west mouth to the muster
  // court, where it forks — the yard west, the old road on south.
  for (let y = 114; y <= 120; y++) b.set(107, y, Tile.Dirt).set(108, y, Tile.Dirt).set(109, y, Tile.Dirt);
  for (let x = 92; x <= 106; x++) b.set(x, 120, Tile.Dirt);
  // The old-road spur: rougher, unpaved, out the south hem at x108.
  for (let y = 121; y <= 223; y++) b.set(107, y, Tile.Dirt).set(108, y, Tile.Dirt);
  // The cook's way: the green's south-east mouth to the long table.
  for (let y = 122; y <= 130; y++) b.set(121, y, Tile.Dirt).set(122, y, Tile.Dirt);
  // The water way: north off the lane past the works to the drover
  // yard, the fishery, and the pier.
  for (let y = 60; y <= 110; y++) b.set(147, y, Tile.Dirt).set(148, y, Tile.Dirt);
  for (let y = 40; y <= 59; y++) b.set(147, y, Tile.Dirt);
  // The school ways: three signed spurs off the muster court.
  for (let x = 68; x <= 91; x++) b.set(x, 152, Tile.Dirt); // west, to the butts
  for (let y = 121; y <= 151; y++) b.set(91, y, Tile.Dirt); // the yard's own approach
  for (let y = 153; y <= 196; y++) b.set(76, y, Tile.Dirt); // south, to the spark circle
  // The copse road: the butts' west end into Alder's stands.
  for (let x = 34; x <= 67; x++) b.set(x, 152, Tile.Dirt);
  for (let y = 140; y <= 151; y++) b.set(34, y, Tile.Dirt);
  // The granary track: off the old road, east past the ruin.
  for (let x = 109; x <= 145; x++) b.set(x, 164, Tile.Dirt);

  // ================================================================
  // THE WAKING RING — the arrival. Seven weathered stones on a
  // flowered stone pad, and nothing else within eight tiles that is
  // not flower, pebble or grass. Nobody explains it; the village only
  // tends it. The five that have always stood kept their world tiles.
  // ================================================================
  b.fillEllipse(78.5, 112.5, 7.5, 6, Tile.StoneFloor);
  // The pad is OLD: grass has taken the cracks back at its rim, and
  // nobody has ever re-laid it. A ruled ellipse reads as pavement.
  for (const [gx, gy] of [
    [72, 108], [85, 109], [71, 116], [86, 117], [77, 106], [80, 119], [87, 111],
  ] as const) b.set(gx, gy, Tile.Grass);
  // SEVEN STONES. They are standing stones, not boulders — the first
  // silhouette in the game reads as a ring of pillars against sky.
  b.set(78, 108, Tile.PillarStone); // N   world (-82,44)
  b.set(74, 110, Tile.PillarStone); // NW  world (-86,46)
  b.set(82, 109, Tile.PillarStone); // NE  world (-78,45)
  b.set(74, 115, Tile.PillarStone); // SW  world (-86,51)
  b.set(81, 116, Tile.PillarStone); // SE  world (-79,52)
  b.set(72, 112, Tile.PillarStone); // W   world (-88,48) — added, closes the ring
  b.set(85, 113, Tile.PillarStone); // E   world (-75,49) — added, closes the ring
  // Two more lie where they fell, outside the ring. Nobody set them up
  // again; nobody knows who set them up the first time.
  b.set(68, 118, Tile.Rock).set(89, 106, Tile.Rock);
  // The worn ring inside the stones — fifty years of first footsteps.
  for (const [px, py] of [
    [76, 110], [80, 110], [82, 112], [80, 115], [76, 115], [74, 112], [78, 111],
    [78, 114], [77, 112], [79, 113],
  ] as const) b.setDetail(px, py, Detail.Pebbles);
  b.setDetail(75, 113, Detail.Flowers).setDetail(83, 115, Detail.Flowers);
  b.setDetail(81, 107, Detail.Flowers);
  // Flowers crowd every crack and the verge beyond.
  for (const [fx, fy] of [
    [75, 108], [80, 107], [83, 112], [79, 118], [73, 117], [70, 110], [84, 116],
    [68, 106], [86, 105], [88, 119], [67, 120], [71, 103], [90, 110], [64, 114],
  ] as const) b.setDetail(fx, fy, Detail.Flowers);
  b.set(70, 105, Tile.GrassTall).set(87, 118, Tile.GrassTall);
  b.set(66, 117, Tile.GrassTall).set(89, 104, Tile.GrassTall);
  // The two lamps that mark the one worn way east. Nothing else.
  b.set(88, 109, Tile.LampPost);
  b.set(88, 115, Tile.LampPost);
  // The meadow west: soft distance, two old oaks, and no more.
  b.set(38, 104, Tile.TreeOak).set(30, 122, Tile.TreeOak);
  for (const [fx, fy] of [
    [52, 100], [44, 116], [58, 126], [34, 112], [24, 106], [48, 132], [20, 124],
  ] as const) b.setDetail(fx, fy, Detail.Flowers);
  b.set(46, 108, Tile.GrassTall).set(56, 118, Tile.GrassTall);
  b.set(28, 130, Tile.GrassTall).set(40, 96, Tile.GrassTall);

  // ================================================================
  // WREN'S COTTAGE — the keeper's house, and the only built thing
  // between the stones and the village. Her porch faces the Ring: she
  // knits there, and she has seen every waker's first step for fifty
  // years.
  // ================================================================
  b.building(88, 98, 11, 11, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 5 }],
    windows: [
      { side: 's', at: 2 }, { side: 's', at: 8 },
      { side: 'w', at: 4 }, { side: 'e', at: 4 }, { side: 'n', at: 5 },
    ],
  });
  // The keeper's corner: the shelf, the lectern where the letters she
  // never sent are stacked, and the knitting chair in the west light.
  b.set(89, 99, Tile.Bookshelf).set(90, 99, Tile.Lectern);
  b.setDetail(91, 98, Detail.Tapestry).setDetail(92, 98, Detail.Tapestry);
  b.set(89, 101, Tile.Chair);
  b.set(89, 104, Tile.Hearth);
  b.set(89, 106, Tile.Bench);
  b.set(92, 102, Tile.Table).set(93, 102, Tile.Table).set(92, 103, Tile.Chair).set(93, 101, Tile.Chair);
  b.setDetail(92, 104, Detail.Rug).setDetail(93, 104, Detail.Rug);
  // Her bed: head north, foot at (96,101) — the night path's last tile.
  b.set(96, 100, Tile.Bed).set(96, 101, Tile.Bed);
  b.set(97, 100, Tile.Cabinet);
  b.set(97, 103, Tile.BasketStack);
  b.setDetail(95, 101, Detail.RugRound);
  b.setDetail(93, 107, Detail.Doormat);
  b.setDetail(88, 100, herbBundlesDetail(0));
  b.setDetail(98, 100, trellisDetail(1));
  b.setDetail(90, 108, sillHerbsDetail(0));
  // The porch, facing the stones.
  for (let x = 90; x <= 96; x++) b.set(x, 109, Tile.PorchDeck);
  b.set(90, 109, Tile.TimberPost).set(96, 109, Tile.TimberPost);
  b.set(91, 109, Tile.Chair);
  b.set(95, 109, Tile.WoodStool);
  b.set(89, 109, Tile.FlowerBox).set(97, 109, Tile.FlowerBox);
  b.set(93, 110, Tile.Dirt); // the worn step onto the lane
  // The keeper's garden: a clipped hedge shelters the flower bed and
  // the bee skep against the west wall — fifty years of tending.
  for (let y = 98; y <= 107; y++) b.set(86, y, Tile.Hedge);
  for (let x = 86; x <= 87; x++) b.set(x, 97, Tile.Hedge);
  b.setDetail(87, 100, Detail.Flowers).setDetail(87, 105, Detail.Flowers);
  b.set(87, 102, Tile.HerbPlanter);
  b.set(87, 107, Tile.Apiary);
  b.set(99, 106, Tile.Woodpile);
  b.set(99, 108, Tile.ChoppingBlock);
  b.sign(100, 110, "THE KEEPER'S HOUSE", ['Wren keeps the Ring.', 'Knock, or wait on the step.']);
  // The wayshrine on the keeper's way — the old hound, worn smooth.
  b.set(103, 115, Tile.WayShrine);
  b.setDetail(103, 116, Detail.Pebbles);
  b.set(101, 115, Tile.StoneBench);
  b.set(105, 109, Tile.LampPost);

  // ================================================================
  // THE GREEN — the hub, on the world's exact centre. The well, the
  // bell, the board, the great oak, and four signed ways. The middle
  // stays EMPTY: a green is the space, not the props around it.
  // ================================================================
  // A GREEN IS GRASS. Stone only where feet actually wear it: the
  // well's court, and the lane the whole village already walks.
  b.fillEllipse(114.5, 108.5, 5.5, 4, Tile.StoneFloor);
  b.set(114, 108, Tile.Well);
  b.set(111, 107, Tile.TownBell);
  b.set(117, 107, Tile.NoticeBoard);
  b.set(112, 110, Tile.StoneBench).set(117, 110, Tile.StoneBench);
  b.setDetail(114, 110, Detail.Pebbles).setDetail(116, 106, Detail.Pebbles);
  b.setDetail(112, 106, Detail.Pebbles);
  // The great oak on the north-east grass, and the seats under it.
  b.set(133, 108, Tile.TreeOak);
  b.set(131, 110, Tile.StoneBench);
  b.set(127, 118, Tile.Bench).set(134, 116, Tile.Bench);
  b.set(108, 106, bannerPoleTile(3)).set(135, 106, bannerPoleTile(5));
  b.set(108, 122, bannerPoleTile(8)).set(135, 122, bannerPoleTile(1));
  b.set(109, 109, Tile.LampPost).set(134, 109, Tile.LampPost);
  b.set(109, 119, Tile.LampPost).set(134, 119, Tile.LampPost);
  // Planters where the lane meets the grass — staggered, never ruled.
  b.set(111, 115, Tile.StreetPlanter).set(120, 116, Tile.StreetPlanter);
  b.set(125, 109, Tile.StreetPlanter).set(132, 114, Tile.StreetPlanter);
  b.set(113, 120, Tile.FlowerBox).set(129, 121, Tile.FlowerBox);
  for (const [fx, fy] of [
    [110, 113], [116, 118], [122, 107], [128, 116], [131, 120], [119, 121], [135, 112],
  ] as const) b.setDetail(fx, fy, Detail.Flowers);
  b.sign(120, 110, 'DAWNMEAD', ['The village that raises wakers.', 'Learn your hands, then the road.'], Tile.Signpost);
  // Three ways, each saying what it is before you take it — signed at
  // the mouth it belongs to, never all in one eyeful. (The First Road
  // keeps its own board out at the gate, where leaving happens.)
  b.sign(124, 106, 'THE HOMESTEAD WAY', ['Brammel keeps the field,', 'Sorrel the stalls.'], Tile.Signpost);
  b.sign(105, 115, 'THE PROVING WAY', ['Blade, bow and spark.', 'Halla musters at seven.'], Tile.Signpost);
  b.sign(125, 121, "THE COOK'S WAY", ['Berrit feeds all comers.', 'The table is long.'], Tile.Signpost);
  // The market pitch on the green's own grass — two stalls shoulder to
  // shoulder, the produce stand that never comes down, and the crate
  // somebody keeps meaning to take home.
  b.set(128, 104, Tile.MarketStall).set(129, 104, Tile.MarketStall);
  b.set(131, 104, Tile.ProduceStand);
  b.set(126, 105, Tile.CrateGoods).set(132, 106, Tile.BarrelStack);

  // ================================================================
  // THE FIVE STONES — the inn, named for the only thing every guest
  // has in common (nobody has corrected the name since the ring grew
  // two). Common room west, guest wing east: the first bed a waker
  // can call home.
  // ================================================================
  b.building(112, 86, 19, 17, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 9 }],
    windows: [
      { side: 's', at: 5 }, { side: 's', at: 13 },
      { side: 'w', at: 6 }, { side: 'e', at: 6 },
      { side: 'n', at: 5 }, { side: 'n', at: 13 },
    ],
  });
  b.set(112, 102, Tile.WallWoodDiagSE).set(130, 102, Tile.WallWoodDiagSW);
  b.set(120, 102, Tile.DoorwayWoodWide).set(121, 102, Tile.DoorwayWoodWide);
  // The bar: the counter run, the keg behind it, the stocked back-bar.
  b.set(114, 90, Tile.Counter).set(115, 90, Tile.Counter).set(116, 90, Tile.Counter).set(117, 90, Tile.Counter);
  b.set(113, 89, Tile.BrewKeg).set(114, 89, Tile.TapCask); // the back bar; the serving lane stays open at y88
  b.set(115, 87, Tile.Cabinet).set(116, 87, Tile.ShopShelf).set(117, 87, Tile.GlazedJars);
  b.set(119, 88, Tile.Barrel);
  b.set(118, 87, Tile.BasketStack);
  // The common room: the hearth on the west wall, three honest tables.
  b.set(112, 94, Tile.Hearth);
  b.set(114, 94, Tile.Table).set(115, 94, Tile.Table);
  b.set(114, 93, Tile.Chair).set(115, 95, Tile.Chair).set(116, 94, Tile.Chair);
  b.set(118, 97, Tile.Table).set(119, 97, Tile.Table);
  b.set(118, 96, Tile.Chair).set(119, 98, Tile.Chair);
  b.set(114, 99, Tile.Table).set(114, 100, Tile.Chair);
  b.set(113, 97, Tile.Bench);
  b.setDetail(115, 93, Detail.Rug).setDetail(116, 93, Detail.Rug);
  b.setDetail(118, 98, Detail.Rug).setDetail(119, 98, Detail.Rug);
  b.setDetail(112, 90, wallBannerDetail(6));
  // Gilly's corner behind the bar's end: her own small bed.
  b.set(113, 99, Tile.Bed).set(113, 100, Tile.Bed);
  b.setDetail(114, 100, Detail.RugRound);
  b.set(112, 99, Tile.Cabinet);
  // The guest wing: a partition, an aisle, four claimable beds.
  for (let y = 87; y <= 101; y++) b.set(123, y, Tile.WallWood);
  b.set(123, 95, Tile.DoorwayWood);
  b.set(125, 88, Tile.Bed).set(125, 89, Tile.Bed);
  b.set(128, 88, Tile.Bed).set(128, 89, Tile.Bed);
  b.set(125, 92, Tile.Bed).set(125, 93, Tile.Bed);
  b.set(128, 92, Tile.Bed).set(128, 93, Tile.Bed);
  b.set(126, 87, Tile.Cabinet); // NW of the wing: the NE corner would seal a pocket
  b.set(129, 96, Tile.Cabinet);
  b.set(128, 99, Tile.WoodStool);
  b.setDetail(126, 91, Detail.Rug).setDetail(127, 91, Detail.Rug);
  b.setDetail(126, 95, Detail.Rug).setDetail(127, 95, Detail.Rug);
  b.setDetail(120, 101, Detail.Doormat).setDetail(121, 101, Detail.Doormat);
  b.setDetail(126, 86, herbBundlesDetail(1));
  b.setDetail(117, 102, sillHerbsDetail(2));
  // The frontage: the forecourt, the paired canopies, the shingle
  // between them, the rail for whatever a traveller rides in on, and
  // the brewer's drop on the service side (never out back).
  b.fillRect(110, 103, 22, 3, Tile.StoneFloor);
  b.set(118, 103, awningTile('shed', 3)).set(119, 103, awningTile('shed', 3));
  b.set(122, 103, awningTile('shed', 3)).set(123, 103, awningTile('shed', 3));
  b.setDetail(122, 102, bracketSignDetail(0));
  b.setDetail(118, 102, pennantDetail(3));
  b.sign(116, 104, 'THE FIVE STONES', ['Beds for wakers.', 'Claim one. Come back to it.']);
  b.set(126, 104, Tile.HitchingPost);
  b.set(128, 105, Tile.Bench);
  b.set(110, 88, Tile.BarrelStack);
  b.set(110, 91, Tile.CrateStack);
  b.set(132, 90, Tile.Woodpile);
  b.set(132, 93, Tile.LeanLadder);
  b.set(111, 105, Tile.LampPost).set(131, 105, Tile.LampPost);

  // ================================================================
  // THE COTTAGE ROW — three roofs, alike as siblings and different as
  // siblings. Nobody in the cast lives here; the doors work, the
  // hearths are lit, and the village is not thirteen people.
  // ================================================================
  const cottage = (x: number, y: number, kind: 'trim' | 'worn' | 'green'): void => {
    b.building(x, y, 8, 8, {
      wall: Tile.WallWood,
      floor: Tile.WoodFloor,
      doors: [{ side: 's', at: 4 }],
      windows: [{ side: 's', at: 2 }, { side: 'w', at: 3 }, { side: 'e', at: 5 }],
    });
    b.set(x + 1, y + 1, Tile.Bed).set(x + 1, y + 2, Tile.Bed);
    b.set(x + 6, y + 1, Tile.Hearth);
    b.set(x + 4, y + 4, Tile.Table).set(x + 5, y + 4, Tile.Chair).set(x + 4, y + 5, Tile.Chair);
    b.set(x + 6, y + 6, Tile.WoodStool);
    b.set(x + 2, y + 5, Tile.BasketStack);
    b.setDetail(x + 4, y + 6, Detail.Doormat);
    b.set(x + 3, y + 8, Tile.Dirt);
    if (kind === 'trim') {
      b.set(x + 3, y + 1, Tile.Cabinet);
      b.setDetail(x + 2, y + 4, Detail.RugRound);
      b.set(x - 1, y + 7, Tile.FlowerBox).set(x + 8, y + 7, Tile.FlowerBox);
      b.setDetail(x + 6, y + 7, trellisDetail(0));
    } else if (kind === 'worn') {
      b.set(x + 3, y + 2, Tile.Crate).set(x + 6, y + 5, Tile.Barrel);
      b.set(x + 8, y + 4, Tile.Woodpile);
      b.set(x - 1, y + 5, Tile.BroomAndPail);
      b.setDetail(x + 1, y + 8, Detail.Sawdust);
    } else {
      b.set(x + 6, y + 5, Tile.Cabinet);
      b.setDetail(x + 3, y + 4, Detail.RugRound);
      b.set(x + 8, y + 2, Tile.HerbPlanter);
      for (let gy = y + 1; gy <= y + 6; gy++) b.set(x - 2, gy, Tile.Hedge);
      b.setDetail(x - 1, y + 2, Detail.Flowers).setDetail(x - 1, y + 5, Detail.Flowers);
      b.setDetail(x + 5, y + 7, trellisDetail(2));
    }
  };
  // Set back from each other by a course or two: three families, three
  // decisions about where the door should face the morning.
  cottage(85, 83, 'green');
  cottage(98, 85, 'worn');
  cottage(72, 82, 'trim');
  b.set(94, 88, Tile.Apiary);
  b.set(94, 91, Tile.ChoppingBlock);
  b.setDetail(93, 89, Detail.Flowers).setDetail(95, 90, Detail.Tuft);
  b.set(107, 92, Tile.StreetLantern);
  b.set(95, 92, Tile.StreetLantern);
  b.setDetail(93, 91, Detail.Pebbles).setDetail(105, 91, Detail.Pebbles);

  // ================================================================
  // THE FARMSTEAD — Brammel's ground: the tilled fields at the top of
  // the world, the farmhouse and the barn on the yard, the coop, the
  // silo, the bees, and the long grass where the stray eggs end up.
  // ================================================================
  // The tilled fields: five crops in, one bed resting, the scarecrow
  // minding all of it. Brammel's whole horizon.
  b.fillRect(98, 16, 37, 15, Tile.Tilled);
  for (let x = 99; x <= 111; x++) {
    b.set(x, 17, x % 3 === 0 ? Tile.WheatRipe : Tile.WheatMid);
    b.set(x, 19, x % 2 === 0 ? Tile.BarleyRipe : Tile.BarleyMid);
  }
  for (let x = 99; x <= 109; x++) {
    b.set(x, 22, x % 3 === 1 ? Tile.CarrotRipe : Tile.CarrotMid);
    b.set(x, 24, x % 2 === 1 ? Tile.OnionRipe : Tile.OnionMid);
  }
  for (let x = 114; x <= 126; x++) {
    b.set(x, 18, x % 3 === 0 ? Tile.CabbageRipe : Tile.CabbageMid);
    b.set(x, 20, x % 2 === 0 ? Tile.PotatoRipe : Tile.PotatoMid);
  }
  for (let x = 114; x <= 124; x++) b.set(x, 23, x % 3 === 2 ? Tile.PumpkinRipe : Tile.PumpkinMid);
  b.set(112, 21, Tile.Scarecrow);
  for (let y = 17; y <= 27; y++) b.set(129, y, Tile.IrrigationChannel);
  b.set(131, 18, Tile.GrowingFrame).set(132, 18, Tile.GrowingFrame);
  b.set(131, 21, Tile.GrowingFrame).set(132, 21, Tile.GrowingFrame);
  b.set(134, 24, Tile.CompostBin);
  b.set(131, 27, Tile.Wheelbarrow);
  b.set(99, 28, Tile.HandCart);
  b.setDetail(105, 27, Detail.Straw).setDetail(120, 27, Detail.Straw);
  b.sign(117, 30, "BRAMMEL'S FIELD", ['Six beds, five crops,', 'one man who wants rain.'], Tile.Signpost);
  // The farmhouse: one long family room, beds along the north wall.
  b.building(100, 34, 15, 13, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 7 }],
    windows: [
      { side: 's', at: 3 }, { side: 's', at: 11 },
      { side: 'w', at: 5 }, { side: 'e', at: 5 }, { side: 'n', at: 7 },
    ],
  });
  b.set(101, 35, Tile.Bed).set(101, 36, Tile.Bed);   // Brammel
  b.set(104, 35, Tile.Bed).set(104, 36, Tile.Bed);   // Tansy
  b.set(107, 35, Tile.Bed).set(107, 36, Tile.Bed);   // Wick
  b.set(112, 35, Tile.Bed).set(112, 36, Tile.Bed);   // Sorrel boards here
  b.set(102, 35, Tile.Cabinet).set(110, 35, Tile.Cabinet);
  b.setDetail(105, 37, Detail.RugRound);
  b.set(101, 40, Tile.Hearth);
  b.set(105, 41, Tile.Table).set(106, 41, Tile.Table).set(107, 41, Tile.Table);
  b.set(105, 40, Tile.Bench).set(106, 40, Tile.Bench).set(107, 40, Tile.Bench);
  b.set(105, 42, Tile.Bench).set(106, 42, Tile.Bench).set(107, 42, Tile.Bench);
  b.set(112, 39, Tile.Basin).set(113, 40, Tile.GrainSacks);
  b.set(112, 44, Tile.ButterChurn).set(113, 43, Tile.GlazedJars);
  b.setDetail(106, 43, Detail.Rug).setDetail(107, 43, Detail.Rug);
  b.setDetail(107, 45, Detail.Doormat);
  b.setDetail(102, 34, herbBundlesDetail(2));
  b.setDetail(103, 46, sillHerbsDetail(1));
  b.setDetail(114, 41, trellisDetail(0));
  // The barn: the wide wain door on the yard, the mow, the tack side.
  b.building(122, 34, 15, 13, {
    wall: Tile.WallWood,
    floor: Tile.Dirt,
    doors: [{ side: 's', at: 7 }],
    windows: [{ side: 'n', at: 4 }, { side: 'n', at: 10 }],
  });
  b.set(128, 46, Tile.DoorwayWoodWide).set(129, 46, Tile.DoorwayWoodWide);
  b.set(123, 35, Tile.HayBale).set(124, 35, Tile.HayBale).set(123, 36, Tile.HayBale);
  b.set(135, 35, Tile.GrainSacks).set(135, 36, Tile.GrainSacks);
  b.set(123, 43, Tile.FeedTrough);
  b.set(135, 43, Tile.ToolRack);
  b.set(133, 39, Tile.FruitPress);
  b.set(126, 39, Tile.Crate).set(127, 39, Tile.BarrelStack);
  b.set(130, 37, Tile.HayBale).set(131, 37, Tile.HayBale);
  b.set(126, 43, Tile.Wheelbarrow).set(131, 41, Tile.GrainSacks);
  b.setDetail(128, 42, Detail.Straw).setDetail(131, 44, Detail.Straw);
  b.setDetail(125, 44, Detail.Straw).setDetail(133, 37, Detail.Straw);
  b.setDetail(124, 34, wallArmsDetail(1));
  b.set(138, 41, Tile.LumberRack).set(138, 43, Tile.CrateStack);
  b.sign(138, 48, "THE BARN", ['Mind the wain door.', 'Hay above, tack below.'], Tile.Signpost);
  // The yard between them: the cart, the block, the well-worn dirt.
  b.fillRect(115, 47, 22, 4, Tile.Dirt);
  b.set(124, 47, awningTile('board', 6)).set(125, 47, awningTile('board', 6));
  b.set(133, 47, awningTile('board', 6)).set(134, 47, awningTile('board', 6));
  b.set(116, 49, Tile.HandCart);
  b.set(133, 49, Tile.ChoppingBlock).set(134, 49, Tile.Woodpile);
  b.set(120, 50, Tile.WaterTrough);
  b.set(126, 49, Tile.BarrelStack).set(130, 50, Tile.Wheelbarrow);
  b.setDetail(122, 49, Detail.Pebbles).setDetail(128, 50, Detail.Straw);
  b.setDetail(118, 48, Detail.Straw).setDetail(131, 48, Detail.Pebbles);
  // The strip between house and barn: the kitchen plot and the line
  // where the washing goes out. A gap is not a garden until you plant it.
  b.set(117, 38, Tile.HerbPlanter).set(117, 41, Tile.GrowingFrame);
  b.set(119, 36, Tile.BasketStack).set(119, 43, Tile.BroomAndPail);
  b.setDetail(118, 40, Detail.Flowers).setDetail(118, 37, Detail.Flowers);
  // The coop: rail-penned dirt, straw, the gap in the run IS the door.
  b.fillRect(101, 52, 13, 9, Tile.Dirt);
  for (let x = 100; x <= 114; x++) b.set(x, 51, Tile.RailWood);
  for (let x = 100; x <= 106; x++) b.set(x, 61, Tile.RailWood);
  for (let x = 110; x <= 114; x++) b.set(x, 61, Tile.RailWood);
  for (let y = 52; y <= 60; y++) b.set(100, y, Tile.RailWood).set(114, y, Tile.RailWood);
  b.set(103, 54, Tile.Dovecote);
  b.set(111, 54, Tile.FeedTrough);
  b.set(112, 58, Tile.CritterCage);
  b.setDetail(105, 56, Detail.Straw).setDetail(108, 58, Detail.Straw);
  b.setDetail(102, 59, Detail.Straw).setDetail(110, 53, Detail.Straw);
  b.sign(108, 63, 'THE COOP', ['Hens roam. Eggs happen.', 'Shut nothing behind you.'], Tile.Signpost);
  // The silo, the bees, and the long grass at the pasture's shoulder.
  b.set(117, 55, Tile.Silo);
  b.set(94, 50, Tile.Apiary).set(94, 54, Tile.Apiary).set(96, 57, Tile.Apiary);
  b.setDetail(95, 52, Detail.Flowers).setDetail(95, 56, Detail.Flowers);
  b.set(98, 63, Tile.GrassTall).set(116, 63, Tile.GrassTall);
  b.set(93, 62, Tile.GrassTall).set(119, 60, Tile.GrassTall);

  // ================================================================
  // THE COMMON PASTURE — the big fenced field between the farm and the
  // village: cows, sheep, the trough by the west rail, hay put up
  // against winter, the gates standing open.
  // ================================================================
  b.outlineRect(96, 66, 45, 17, Tile.Fence);
  b.set(96, 74, Tile.FenceGate);
  b.set(120, 66, Tile.FenceGate).set(121, 66, Tile.FenceGate);
  b.set(120, 82, Tile.FenceGate).set(121, 82, Tile.FenceGate);
  b.set(99, 69, Tile.WaterTrough);
  b.set(136, 69, Tile.HayBale).set(137, 70, Tile.HayBale).set(136, 71, Tile.HayBale);
  b.set(103, 79, Tile.HayBale);
  b.setDetail(106, 72, Detail.Straw).setDetail(115, 78, Detail.Straw);
  b.setDetail(130, 74, Detail.Straw).setDetail(125, 70, Detail.Tuft);
  b.set(101, 76, Tile.GrassTall).set(112, 68, Tile.GrassTall);
  b.set(128, 79, Tile.GrassTall).set(134, 73, Tile.GrassTall);
  b.set(108, 81, Tile.GrassTall);
  b.sign(95, 86, 'THE COMMON', ['Cows west, sheep east,', 'and the gate stays open.'], Tile.Signpost);

  // ================================================================
  // THE ORCHARD — planted lines behind a clipped hedgerow, the living
  // arch onto the orchard walk. The one place in Dawnmead bounded by
  // hedge, not rail: livestock gets post-and-timber, but an orchard is
  // a GARDEN, and fifty years of wakers learning shears kept it square.
  // ================================================================
  b.outlineRect(44, 30, 49, 43, Tile.Hedge);
  b.set(92, 52, Tile.HedgeGate);
  b.set(68, 30, Tile.HedgeGate);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const tx = 48 + col * 5 + (row % 2 ? 2 : 0);
      const ty = 34 + row * 6;
      if (tx >= 91) continue;
      b.set(tx, ty, row % 2 === 0 ? Tile.AppleTreeRipe : Tile.PlumTreeMid);
    }
  }
  b.fillRect(46, 66, 6, 5, Tile.Dirt); // the harvest corner, mid-picking
  b.set(46, 67, Tile.CrateStack).set(47, 67, Tile.CrateGoods);
  b.set(50, 67, Tile.FruitPress);
  b.set(46, 70, Tile.Barrel).set(48, 70, Tile.HandCart);
  b.set(51, 70, Tile.LeanLadder);
  b.setDetail(49, 69, Detail.Sawdust).setDetail(47, 69, Detail.Pebbles);
  b.set(86, 68, Tile.Apiary).set(88, 70, Tile.Apiary);
  b.setDetail(60, 45, Detail.Flowers).setDetail(76, 58, Detail.Flowers);
  b.setDetail(54, 62, Detail.Flowers).setDetail(84, 38, Detail.Flowers);
  b.setDetail(70, 66, Detail.Mushroom).setDetail(58, 36, Detail.Tuft);
  b.set(63, 51, Tile.SaplingOak).set(79, 47, Tile.Sapling);
  b.sign(94, 54, 'THE ORCHARD', ["Windfalls are anybody's.", 'Shake nothing. Ask Alder.'], Tile.Signpost);
  b.sign(62, 28, "HUNTERS' TRAIL", ['No lamps this way.', 'Wolves den in the north wood.'], Tile.Signpost);

  // ================================================================
  // WEIR'S FISHERY — a working waterside, not a man on a plank. The
  // pier on driven piles, the skiff hauled out, the net frames, the
  // mending bench mid-repair, the racks, and the keep pool.
  // ================================================================
  b.building(140, 32, 11, 9, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 4 }],
    windows: [{ side: 's', at: 4 }, { side: 'w', at: 4 }, { side: 'n', at: 6 }],
  });
  b.set(141, 33, Tile.Bed).set(141, 34, Tile.Bed);
  b.set(144, 33, Tile.Cabinet);
  b.set(141, 38, Tile.Hearth);
  b.set(148, 34, Tile.Table).set(148, 35, Tile.Chair);
  b.set(148, 38, Tile.WithyStore);
  b.setDetail(143, 36, Detail.RugRound);
  b.setDetail(149, 36, Detail.Doormat);
  b.setDetail(145, 32, herbBundlesDetail(0));
  b.setDetail(144, 40, sillHerbsDetail(0));
  // The yard: everything a river gives you, and everything you give
  // back to it. The bench is where the whole trade actually happens.
  b.fillRect(140, 42, 15, 11, Tile.Dirt);
  b.set(141, 43, Tile.MendingBench);
  b.set(143, 43, Tile.NetFrame).set(145, 43, Tile.NetFrame);
  b.set(148, 43, Tile.WeirPanels);
  b.set(140, 46, Tile.FishRack).set(140, 48, Tile.DryingRack);
  b.set(140, 51, Tile.SmokeTripod);
  b.set(143, 46, Tile.CatchBasket).set(143, 51, Tile.FishTrap);
  b.set(145, 49, Tile.WithyStore);
  b.set(148, 46, Tile.HarpoonRack);
  b.set(150, 51, Tile.LurePole);
  b.set(155, 51, Tile.BeachedSkiff).set(156, 52, Tile.MooringPost);
  b.set(151, 43, Tile.Barrel).set(152, 44, Tile.CrateStack);
  b.set(146, 52, Tile.ShellBench).set(150, 48, Tile.WoodStool);
  b.setDetail(147, 45, Detail.Pebbles).setDetail(149, 50, Detail.Pebbles);
  b.setDetail(144, 52, Detail.Pebbles).setDetail(142, 49, Detail.Pebbles);
  b.setDetail(146, 47, Detail.Pebbles);
  b.set(142, 41, awningTile('shed', 7)).set(143, 41, awningTile('shed', 7));
  b.sign(140, 55, "WEIR'S REACH", ['Rod, line and patience.', 'Mostly patience.'], Tile.Signpost);
  b.set(153, 42, Tile.MooringPost).set(153, 52, Tile.MooringPost);

  // ================================================================
  // SORREL'S DROVER YARD — down by the water where the beasts drink.
  // Rail pens, the one stall door every tamed friend in the world
  // walks through first, and a drover who talks to the animals more
  // than the owners.
  // ================================================================
  b.fillRect(140, 70, 16, 17, Tile.Dirt);
  for (let x = 139; x <= 156; x++) if (x !== 147 && x !== 148) b.set(x, 69, Tile.RailWood);
  for (let x = 139; x <= 144; x++) b.set(x, 87, Tile.RailWood);
  for (let x = 149; x <= 156; x++) b.set(x, 87, Tile.RailWood);
  for (let y = 70; y <= 86; y++) b.set(139, y, Tile.RailWood);
  for (let y = 70; y <= 76; y++) b.set(156, y, Tile.RailWood);
  for (let y = 81; y <= 86; y++) b.set(156, y, Tile.RailWood);
  for (let x = 140; x <= 155; x++) b.set(x, 78, Tile.RailWood);
  b.set(146, 78, Tile.Dirt).set(147, 78, Tile.Dirt); // the pen gap: the keeper's door
  b.set(143, 73, Tile.BeastPen);
  b.set(141, 71, Tile.FeedTrough).set(153, 71, Tile.FeedTrough);
  b.set(141, 84, Tile.WaterTrough);
  b.set(154, 83, Tile.HayBale).set(155, 84, Tile.HayBale);
  b.set(151, 74, Tile.GnawTrough);
  b.set(150, 82, Tile.BeastNest);
  b.setDetail(145, 75, Detail.Straw).setDetail(152, 79, Detail.Straw);
  b.setDetail(142, 81, Detail.Straw).setDetail(148, 85, Detail.Straw);
  // The tack lean-to on the yard's head, and the rail a buyer ties to.
  b.set(144, 66, Tile.WallWood).set(145, 66, Tile.WallWood).set(146, 66, Tile.WallWood);
  b.set(144, 67, awningTile('board', 2)).set(145, 67, awningTile('board', 2)).set(146, 67, awningTile('board', 2));
  b.set(144, 68, Tile.ToolRack).set(146, 68, Tile.Crate);
  b.set(150, 67, Tile.HitchingPost).set(152, 67, Tile.HitchingPost);
  b.sign(149, 89, 'THE STALLS', ["Sorrel's yard. Speak soft.", 'Beasts at the rail.'], Tile.Signpost);

  // ================================================================
  // OTTERY'S WORKS — the trade you can read from the street. The
  // timber shed west, the forge east, the yard between them, and a
  // finished-goods rack facing the lane so a waker sees what a bar of
  // bronze is FOR before Amberford ever asks.
  // ================================================================
  b.fillRect(138, 96, 19, 14, Tile.Dirt);
  // Ottery's own room at the yard's head — the shelf inside keeps
  // every waker's first mangled craft.
  b.building(138, 90, 10, 7, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 4 }],
    windows: [{ side: 'w', at: 3 }, { side: 'n', at: 6 }],
  });
  b.set(139, 91, Tile.Bed).set(139, 92, Tile.Bed);
  b.set(145, 91, Tile.Bookshelf); // the shelf of first things
  b.set(146, 94, Tile.Hearth);
  b.set(141, 94, Tile.Table).set(142, 94, Tile.Chair);
  b.setDetail(141, 92, Detail.RugRound);
  b.setDetail(142, 95, Detail.Doormat);
  b.setDetail(143, 90, wallBannerDetail(4));
  // The timber shed: posts, a board roof, and the whole run of wood.
  b.set(138, 99, Tile.TimberPost).set(138, 105, Tile.TimberPost);
  b.set(145, 99, Tile.TimberPost).set(145, 105, Tile.TimberPost);
  b.set(139, 98, Tile.Workbench);
  b.set(141, 98, Tile.Sawhorse);
  b.set(143, 98, Tile.CarvingBench);
  b.set(139, 101, Tile.LumberRack).set(139, 103, Tile.LogPile);
  b.set(141, 103, Tile.ChoppingBlock);
  b.set(143, 102, Tile.FelledLog).set(144, 102, Tile.LogPileEndOn);
  b.set(146, 97, awningTile('board', 6)).set(147, 97, awningTile('board', 6));
  b.setDetail(140, 99, Detail.Sawdust).setDetail(142, 100, Detail.Sawdust);
  b.setDetail(144, 104, Detail.Sawdust).setDetail(140, 104, Detail.Sawdust);
  // The forge: the working triangle, and the fire facing the lane.
  b.set(151, 96, Tile.WallStone).set(152, 96, Tile.WallStone).set(153, 96, Tile.WallStone);
  b.set(154, 96, Tile.WallStone).set(155, 96, Tile.WallStone);
  b.set(151, 97, Tile.Furnace);
  b.set(153, 97, Tile.SmithBellows);
  b.set(155, 97, Tile.IngotRack);
  b.set(152, 100, Tile.Anvil);
  b.set(153, 100, Tile.QuenchTrough);
  b.set(155, 100, Tile.Grindstone);
  b.set(151, 103, Tile.ToolRack);
  b.set(155, 103, Tile.BarrelStack); // the coal store
  b.set(153, 106, Tile.WeaponRack);  // finished steel, facing the lane
  b.set(151, 106, Tile.TiedParcels);
  b.setDetail(152, 98, Detail.Sawdust).setDetail(154, 101, Detail.Pebbles);
  b.setDetail(152, 104, Detail.Pebbles);
  b.setDetail(152, 96, wallArmsDetail(0));
  b.set(152, 97, awningTile('shed', 1)).set(154, 97, awningTile('shed', 1));
  b.set(148, 108, Tile.Wheelbarrow);
  b.set(139, 108, Tile.CrateGoods).set(140, 108, Tile.Crate);
  // The middle of the yard is where the work waits its turn: the
  // board stack, the water for the quench, and the bench a customer
  // sits on while Ottery finds the right chisel.
  b.set(147, 100, Tile.LumberRack).set(147, 102, Tile.LogPileEndOn);
  b.set(149, 105, Tile.WaterCask);
  b.set(146, 106, Tile.Bench).set(145, 108, Tile.WoodStool);
  b.set(149, 98, Tile.TiedParcels);
  b.setDetail(148, 101, Detail.Sawdust).setDetail(146, 104, Detail.Sawdust);
  b.setDetail(150, 103, Detail.Pebbles);
  b.sign(143, 109, "OTTERY'S WORKS", ['Bench, saw, forge.', 'Make your first thing.'], Tile.Signpost);
  b.set(137, 109, Tile.LampPost).set(157, 109, Tile.LampPost);

  // ================================================================
  // THE COOKHOUSE — Berrit's hall. Her cot west, the open hall under
  // timber posts, the long table the whole village eats at, the bake
  // line, the smoke yard downwind, the kitchen garden, and the supper
  // fire on its own court.
  // ================================================================
  b.building(112, 126, 8, 11, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 5 }],
    windows: [{ side: 's', at: 3 }, { side: 'w', at: 4 }, { side: 'n', at: 4 }],
  });
  b.set(113, 127, Tile.Bed).set(113, 128, Tile.Bed);
  b.set(113, 130, Tile.Cabinet);
  b.set(117, 127, Tile.Basin);
  b.set(117, 130, Tile.HerbRack);
  b.set(113, 134, Tile.GlazedJars).set(117, 134, Tile.BasketStack);
  b.setDetail(115, 129, Detail.RugRound);
  b.setDetail(118, 131, Detail.Doormat);
  b.setDetail(113, 126, herbBundlesDetail(0));
  b.setDetail(115, 136, sillHerbsDetail(0));
  // The open hall: posts, stone floor, the long table down the middle.
  b.fillRect(121, 126, 13, 11, Tile.StoneFloor);
  b.set(121, 126, Tile.TimberPost).set(133, 126, Tile.TimberPost);
  b.set(121, 136, Tile.TimberPost).set(133, 136, Tile.TimberPost);
  b.set(127, 126, Tile.TimberPost).set(127, 136, Tile.TimberPost);
  b.set(124, 131, Tile.Table).set(125, 131, Tile.Table).set(126, 131, Tile.Table);
  b.set(127, 131, Tile.Table).set(128, 131, Tile.Table).set(129, 131, Tile.Table);
  for (let x = 124; x <= 129; x++) b.set(x, 130, Tile.Bench).set(x, 132, Tile.Bench);
  b.set(123, 128, Tile.Hearth);
  b.set(131, 128, Tile.CookPot);
  b.set(123, 134, Tile.WaterCask);
  b.set(131, 134, Tile.Bench);
  b.set(122, 132, Tile.BasketStack).set(122, 129, Tile.GlazedJars);
  b.set(132, 130, Tile.WoodStool).set(132, 132, Tile.WoodStool);
  b.set(125, 135, Tile.Barrel).set(129, 135, Tile.TiedParcels);
  b.setDetail(126, 134, Detail.Pebbles).setDetail(129, 128, Detail.Pebbles);
  // The bake line on the hall's north face, and the smoke yard east —
  // each on its own worked apron. A station standing on lawn reads as
  // a prop somebody dropped.
  b.fillRect(121, 123, 12, 3, Tile.Dirt);
  b.fillRect(135, 126, 4, 9, Tile.Dirt);
  b.setDetail(128, 124, Detail.Pebbles).setDetail(132, 125, Detail.Sawdust);
  b.setDetail(137, 132, Detail.Pebbles).setDetail(136, 128, Detail.Pebbles);
  b.set(124, 124, Tile.BreadOven);
  b.set(122, 124, Tile.GrainSacks);
  b.set(126, 124, Tile.Woodpile);
  b.set(130, 124, Tile.ButcherBlock);
  b.set(136, 127, Tile.MeatSpit);
  b.set(136, 130, Tile.Smoker);
  b.set(136, 133, Tile.MeatRack);
  b.set(138, 131, Tile.Barrel);
  b.setDetail(137, 129, Detail.Pebbles);
  b.sign(120, 138, 'THE LONG TABLE', ['Berrit feeds all comers.', 'Wash your hands.'], Tile.Signpost);
  // The kitchen garden: the hedge ring, the rows, the whole lifecycle.
  for (let x = 112; x <= 122; x++) b.set(x, 140, Tile.Hedge);
  for (let x = 112; x <= 122; x++) b.set(x, 148, Tile.Hedge);
  for (let y = 141; y <= 147; y++) b.set(112, y, Tile.Hedge).set(122, y, Tile.Hedge);
  b.set(117, 140, Tile.HedgeGate); // the arch, facing her own gable
  for (const gy of [142, 144, 146]) {
    for (let x = 114; x <= 120; x++) {
      b.set(x, gy, (x + gy) % 2 === 0
        ? (gy === 142 ? Tile.SagewortRipe : gy === 144 ? Tile.BittercressMid : Tile.MoonbellRipe)
        : Tile.Tilled);
    }
  }
  b.set(113, 142, Tile.HerbPlanter);
  b.set(113, 146, Tile.GrowingFrame);
  b.set(121, 146, Tile.DryingRack);
  b.set(121, 142, Tile.Alembic);
  // The supper court — the ONE campfire, where the cooking lesson
  // happens and the village gathers at dusk.
  b.fillEllipse(129, 145, 5, 4, Tile.Dirt);
  b.set(129, 144, Tile.Campfire);
  b.set(126, 147, Tile.Bench).set(132, 147, Tile.Bench);
  b.set(126, 142, Tile.Bench).set(132, 142, Tile.Bench);
  b.set(134, 145, Tile.Woodpile);
  b.setDetail(129, 146, Detail.Pebbles).setDetail(127, 144, Detail.Pebbles);
  b.setDetail(131, 143, Detail.Pebbles);
  b.set(124, 139, Tile.StreetLantern);

  // ================================================================
  // THE MUSTER COURT — where the proving way arrives and the arms
  // quarter introduces itself: the muster standard, the board, the
  // rack, watchers' benches, and the three signed ways.
  // ================================================================
  b.fillEllipse(96, 126, 11, 9, Tile.Dirt);
  b.fillRect(90, 119, 13, 3, Tile.Dirt); // the muster line, worn straight
  // THE MUSTER LINE — what the yard forms up on, and the board that
  // tells it what it is forming up for.
  b.set(96, 119, bannerStandTile(1)).set(100, 119, bannerStandTile(6));
  b.set(93, 119, Tile.NoticeBoard);
  b.set(90, 120, Tile.WeaponRack).set(103, 120, Tile.SpearRack);
  b.set(92, 122, Tile.ArmorStandFull).set(101, 122, Tile.ArmorStand);
  // The watchers' side: benches, and the rail a visitor ties to.
  b.set(87, 123, Tile.Bench).set(87, 124, Tile.Bench);
  b.set(105, 126, Tile.Bench).set(105, 127, Tile.Bench);
  b.set(88, 128, Tile.HitchingPost);
  // The yard's own housekeeping, ranked at the west hem.
  b.set(87, 131, Tile.Grindstone).set(89, 132, Tile.Woodpile);
  b.set(103, 131, Tile.WaterCask).set(104, 133, Tile.Barrel);
  b.set(94, 133, Tile.HayBale).set(95, 132, Tile.HayBale);
  b.set(99, 133, Tile.CrateStack);
  b.set(91, 130, Tile.TargetDummy).set(101, 129, Tile.TargetDummy);
  b.setDetail(91, 127, Detail.Pebbles).setDetail(100, 128, Detail.Pebbles);
  b.setDetail(96, 124, Detail.Pebbles).setDetail(93, 131, Detail.Straw);
  b.setDetail(98, 126, Detail.Sawdust).setDetail(102, 133, Detail.Straw);
  b.setDetail(91, 131, Detail.Straw);
  b.set(85, 117, Tile.LampPost).set(106, 117, Tile.LampPost);
  b.sign(96, 136, 'THE PROVING GROUND', ['Halla keeps the blade.', 'Rill the bow, Varn the spark.'], Tile.Signpost);
  b.sign(69, 150, 'THE LONG BUTTS', ['Loose only EAST.', 'Walk the lane, never the line.'], Tile.Signpost);
  b.sign(93, 148, 'THE PELL YARD', ['Wood first, then steel.', 'Again. Better.'], Tile.Signpost);
  b.sign(78, 194, 'THE SPARK CIRCLE', ['Stand outside the stones', 'until Varn says otherwise.'], Tile.Signpost);
  b.sign(110, 122, 'THE OLD ROAD', ['Kingsdelf country, unlit.', 'Not for new feet.'], Tile.Signpost);

  // ================================================================
  // THE PELL YARD — Halla's ground. A rail-ringed sparring court, the
  // pell line, the dressed and the bare stands, the scarred wall the
  // yard has been hitting for thirty years, and the arming shed.
  // ================================================================
  b.fillRect(84, 152, 24, 20, Tile.Dirt);
  for (let x = 83; x <= 108; x++) b.set(x, 151, Tile.RailWood);
  for (let x = 83; x <= 89; x++) b.set(x, 172, Tile.RailWood);
  for (let x = 94; x <= 108; x++) b.set(x, 172, Tile.RailWood);
  for (let y = 152; y <= 171; y++) b.set(83, y, Tile.RailWood);
  for (let y = 156; y <= 171; y++) b.set(108, y, Tile.RailWood);
  // THE SPARRING RING — sand raked into the dirt at the yard's heart.
  // Everything else in this yard faces it.
  b.fillEllipse(95, 163, 7, 5, Tile.Sand);
  b.setDetail(95, 163, Detail.Pebbles).setDetail(92, 161, Detail.Pebbles);
  b.setDetail(98, 165, Detail.Pebbles).setDetail(93, 166, Detail.Straw);
  // The pell line: dummies and posts, ranked but never ruled — thirty
  // years of moving them a pace to spare the worn ground.
  b.set(87, 155, Tile.TargetDummy).set(93, 156, Tile.TargetDummy).set(99, 155, Tile.TargetDummy);
  b.set(90, 158, Tile.TimberPost).set(96, 159, Tile.TimberPost).set(102, 157, Tile.TimberPost);
  b.setDetail(87, 156, Detail.Straw).setDetail(93, 157, Detail.Straw).setDetail(99, 156, Detail.Straw);
  b.setDetail(90, 159, Detail.Sawdust).setDetail(96, 160, Detail.Sawdust);
  b.set(85, 153, Tile.HayBale).set(105, 153, Tile.HayBale).set(104, 154, Tile.HayBale);
  // The stands: two dressed, one bare, and the rack they come off.
  b.set(103, 155, Tile.ArmorStandFull).set(105, 155, Tile.ArmorStandFull);
  b.set(103, 158, Tile.ArmorStand);
  b.set(105, 160, Tile.WeaponRack).set(105, 162, Tile.SpearRack);
  b.set(103, 164, Tile.Grindstone);
  b.set(96, 152, bannerStandTile(1)).set(102, 152, bannerStandTile(6));
  // The scarred wall — the thing the yard actually hits.
  for (let y = 165; y <= 169; y++) b.set(85, y, Tile.WallStone);
  b.set(86, 167, Tile.TargetDummy);
  b.setDetail(86, 168, Detail.Pebbles);
  // The watchers' side and the water.
  b.set(89, 170, Tile.Bench).set(90, 170, Tile.Bench);
  b.set(94, 171, Tile.Bench).set(95, 171, Tile.Bench);
  b.set(99, 169, Tile.WaterCask);
  b.set(101, 171, Tile.Barrel).set(87, 168, Tile.BasketStack);
  b.setDetail(92, 163, Detail.Pebbles).setDetail(99, 167, Detail.Pebbles);
  b.setDetail(95, 161, Detail.Pebbles);
  // THE ARMING SHED — stone, arms on the wall, the duty table inside.
  b.building(96, 176, 13, 12, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 6 }],
    windows: [{ side: 'n', at: 2 }, { side: 'n', at: 10 }, { side: 'w', at: 5 }, { side: 'e', at: 5 }],
  });
  b.set(97, 177, Tile.Bed).set(97, 178, Tile.Bed);   // Halla
  b.set(100, 177, Tile.Bed).set(100, 178, Tile.Bed); // ward bunk
  b.set(103, 177, Tile.Bed).set(103, 178, Tile.Bed); // ward bunk
  b.set(106, 180, Tile.Bed).set(106, 181, Tile.Bed); // the hot bunk
  b.set(101, 181, Tile.Table).set(101, 182, Tile.Chair).set(102, 181, Tile.Chair);
  b.set(97, 185, Tile.Hearth);
  b.set(99, 186, Tile.WeaponRack).set(101, 186, Tile.ArmorStand);
  b.set(106, 185, Tile.Crate).set(107, 186, Tile.Woodpile);
  b.set(107, 177, Tile.Cabinet);
  b.setDetail(101, 184, Detail.Rug).setDetail(102, 184, Detail.Rug);
  b.setDetail(102, 177, Detail.Doormat);
  b.setDetail(99, 176, wallArmsDetail(0)).setDetail(105, 176, wallArmsDetail(2));
  b.setDetail(96, 182, wallBannerDetail(6));
  b.set(94, 178, Tile.Woodpile);
  b.sign(94, 175, 'THE LODGE', ['Halla and the wards.', 'Knock loud; they sleep in shifts.']);
  b.set(93, 173, Tile.LampPost).set(110, 173, Tile.LampPost);

  // ================================================================
  // THE LONG BUTTS — Rill's ground. A fenced lane running WEST to
  // EAST: the stone shooting line, three marks at increasing range,
  // straw butts backed by fence, and the covered shelter she stands
  // in when it rains, which is often.
  // ================================================================
  // A RANGE IS GRASS, worn only where feet stand and arrows land. A
  // ruled dirt rectangle forty tiles long reads as a car park.
  b.fillRect(44, 155, 8, 12, Tile.Dirt);   // the shooting ground
  for (const bx of [56, 66, 76]) b.fillRect(bx, 158, 6, 6, Tile.Dirt); // the marks
  for (let x = 43; x <= 84; x++) b.set(x, 153, Tile.Fence).set(x, 168, Tile.Fence);
  for (let y = 154; y <= 167; y++) b.set(43, y, Tile.Fence);
  for (let y = 154; y <= 160; y++) b.set(84, y, Tile.Fence);
  for (let y = 164; y <= 167; y++) b.set(84, y, Tile.Fence);
  b.set(84, 161, Tile.FenceGate).set(84, 162, Tile.FenceGate); // the walk in, from the court
  b.set(52, 168, Tile.FenceGate).set(53, 168, Tile.FenceGate); // and Rill's own way home
  // The shooting line, west end: dressed stone, and the marks east.
  for (let y = 156; y <= 165; y++) b.set(46, y, Tile.StoneFloor);
  b.setDetail(46, 158, Detail.Pebbles).setDetail(46, 163, Detail.Pebbles);
  // THREE MARKS — ten paces, twenty, thirty. Each is a real butt: a
  // stack of straw, a fence behind it so nothing walks out the back,
  // and a stake at its shoulder that says how far you just shot.
  const butt = (bx: number, dummy: boolean): void => {
    b.set(bx + 3, 158, Tile.HayBale).set(bx + 3, 159, Tile.HayBale);
    b.set(bx + 3, dummy ? 161 : 160, dummy ? Tile.TargetDummy : Tile.HayBale);
    b.set(bx + 3, 162, Tile.HayBale);
    for (let y = 157; y <= 163; y++) b.set(bx + 4, y, Tile.Fence); // the backstop, right behind the straw
    b.set(bx, 158, Tile.TimberPost); // the range stake, at the mark's shoulder
    b.setDetail(bx + 2, 160, Detail.Straw).setDetail(bx + 4, 162, Detail.Straw);
    b.setDetail(bx + 1, 163, Detail.Straw);
  };
  butt(56, false);
  butt(66, true);
  butt(76, true);
  b.set(74, 165, Tile.HayBale).set(64, 156, Tile.HayBale); // spares, dragged clear
  // The shelter on the line: posts, a bowed canopy, the day's tackle.
  b.set(44, 156, Tile.WallWood).set(45, 156, Tile.WallWood);
  b.set(44, 157, Tile.WallWood).set(44, 158, Tile.WallWood);
  b.set(44, 159, awningTile('bowed', 4)).set(45, 157, awningTile('bowed', 4));
  b.set(45, 158, Tile.ToolRack);
  b.set(45, 161, Tile.Bench).set(45, 164, Tile.Barrel);
  // The line itself: the arrow store, the day's tackle, the seat for
  // whoever is not shooting.
  b.set(48, 156, Tile.CrateGoods).set(49, 156, Tile.Barrel);
  b.set(48, 165, Tile.WoodStool).set(50, 163, Tile.BasketStack);
  b.setDetail(48, 160, Detail.Pebbles).setDetail(50, 158, Detail.Pebbles);
  b.setDetail(49, 164, Detail.Straw);
  b.setDetail(44, 156, pennantDetail(4));
  // The bow wood, growing where the bowyer can see it.
  b.set(40, 156, Tile.TreeYew).set(38, 161, Tile.TreeYew).set(41, 166, Tile.TreeWillow);
  b.set(39, 152, Tile.SaplingYew);
  // THE FLETCHER'S SHED, south of the lane, door on the range side.
  b.building(46, 174, 12, 10, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 6 }],
    windows: [{ side: 'n', at: 2 }, { side: 'w', at: 4 }, { side: 'e', at: 6 }],
  });
  b.set(47, 175, Tile.Bed).set(47, 176, Tile.Bed);
  b.set(50, 175, Tile.Cabinet);
  b.set(47, 181, Tile.Hearth);
  b.set(53, 176, Tile.FletchersBench);
  b.set(55, 176, Tile.LumberRack); // staves, on edge between the pegs
  b.set(55, 179, Tile.DryingRack);
  b.set(53, 181, Tile.Table).set(54, 181, Tile.Chair);
  b.set(50, 182, Tile.CrateGoods).set(51, 182, Tile.Crate);
  b.setDetail(49, 179, Detail.RugRound);
  b.setDetail(52, 175, Detail.Doormat);
  b.setDetail(51, 174, bracketSignDetail(3));
  b.setDetail(48, 182, Detail.Sawdust);
  b.set(60, 176, Tile.Stump); // the whittling stump
  b.set(60, 178, Tile.WoodStool);
  b.setDetail(60, 177, Detail.Sawdust);
  b.sign(59, 173, "RILL'S SHED", ['Staves, feathers, glue.', 'Ask before you take a bow.']);

  // ================================================================
  // THE SPARK CIRCLE — Varn's ground. A ring of standing pillars and
  // runestones on an old pad, scorched at the heart, braziers at the
  // quarters, and fifty years of lessons written on the test stones.
  // ================================================================
  b.fillEllipse(74, 202, 11, 8, Tile.StoneFloor);
  for (const [px, py] of [
    [74, 195], [82, 197], [85, 202], [82, 207], [74, 209], [66, 207], [63, 202], [66, 197],
  ] as const) b.set(px, py, py % 2 === 1 ? Tile.PillarStone : Tile.Runestone);
  // Grass has taken the old pad's rim back, the way it takes the Ring's.
  for (const [gx, gy] of [[64, 198], [84, 206], [67, 208], [82, 196], [74, 210]] as const) {
    b.set(gx, gy, Tile.Grass);
  }
  // THE BURNT HEART — where fifty years of lessons have landed.
  b.fillEllipse(74, 202, 3, 2, Tile.Dirt);
  for (const [px, py] of [
    [74, 202], [73, 201], [75, 203], [72, 202], [76, 202], [74, 200], [74, 204],
    [70, 199], [78, 205], [69, 203], [79, 201],
  ] as const) b.setDetail(px, py, Detail.Pebbles);
  b.set(70, 199, Tile.Brazier).set(78, 199, Tile.Brazier);
  b.set(70, 205, Tile.Brazier).set(78, 205, Tile.Brazier);
  // The approach: the ward arch on the way in, and the lamp before it.
  b.set(75, 193, Tile.ArchStone).set(76, 193, Tile.WardArch).set(77, 193, Tile.ArchStone);
  b.set(74, 192, Tile.LampPost);
  // The test stones — cracked, tipped, and honestly earned.
  b.set(88, 200, Tile.BrokenPillar).set(90, 204, Tile.Rock);
  b.set(87, 208, Tile.CrystalCluster);
  // Where the reading happens when the weather allows it.
  b.set(63, 196, Tile.Lectern).set(62, 198, Tile.WoodStool);
  b.set(86, 194, Tile.WeaponRack); // the stave rack
  b.set(88, 197, Tile.Crate);
  b.setDetail(64, 197, Detail.Pebbles).setDetail(87, 196, Detail.Pebbles);
  b.set(60, 210, Tile.RunePillar);
  b.set(64, 213, Tile.TargetDummy).set(84, 212, Tile.TargetDummy);
  b.setDetail(65, 214, Detail.Pebbles).setDetail(85, 213, Detail.Pebbles);
  // The reading shelter: half-read books, all of them open.
  b.building(42, 194, 12, 11, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 5 }],
    windows: [{ side: 'n', at: 6 }, { side: 'w', at: 4 }, { side: 's', at: 6 }],
  });
  b.set(43, 195, Tile.Bed).set(43, 196, Tile.Bed);
  b.set(46, 195, Tile.Bookshelf).set(47, 195, Tile.Bookshelf).set(48, 195, Tile.Bookshelf);
  b.set(43, 199, Tile.Hearth);
  b.set(46, 199, Tile.Lectern).set(48, 200, Tile.ArcaneTome);
  b.set(46, 202, Tile.Table).set(47, 202, Tile.Chair);
  b.set(51, 197, Tile.Cabinet).set(51, 202, Tile.CandleStand);
  b.setDetail(45, 197, Detail.RugRound);
  b.setDetail(52, 199, Detail.Doormat);
  b.setDetail(44, 194, Detail.Tapestry).setDetail(45, 194, Detail.Tapestry);
  b.set(55, 199, Tile.WayShrine);
  b.sign(56, 202, "VARN'S DOOR", ['Old Varn, Sparkwright.', 'He was saying something.']);

  // ================================================================
  // THE COPSE — Alder's managed woodlot: planted stands in loose rows,
  // marked trees, honest stumps, saplings where last year's cut came
  // out, and a real LOG YARD beside his hut.
  // ================================================================
  const woodAt = (x: number, y: number, t: Tile): void => {
    if (b.get(x, y) === Tile.Grass) b.set(x, y, t);
  };
  for (const [tx, ty] of [
    [8, 122], [14, 126], [20, 121], [27, 128], [33, 124], [6, 133], [12, 136],
    [18, 132], [24, 138], [30, 134], [9, 144], [15, 148], [21, 142], [28, 146],
    [34, 141], [7, 156], [13, 160], [19, 155], [25, 162], [31, 158], [10, 170],
    [16, 174], [22, 168], [29, 172], [35, 166], [8, 182], [14, 186], [20, 180],
    [26, 188], [32, 184], [11, 194], [17, 198], [23, 192], [30, 196],
  ] as const) woodAt(tx, ty, Tile.TreeOak);
  for (const [tx, ty] of [
    [11, 129], [23, 133], [5, 150], [17, 165], [27, 155], [33, 176], [12, 190], [36, 190],
  ] as const) woodAt(tx, ty, Tile.Tree);
  for (const [tx, ty] of [[16, 143], [26, 150], [9, 163], [22, 176], [31, 190]] as const) {
    woodAt(tx, ty, Tile.Stump);
  }
  for (const [tx, ty] of [[18, 138], [24, 158], [12, 152], [28, 180]] as const) {
    woodAt(tx, ty, Tile.SaplingOak);
  }
  b.set(15, 172, Tile.MushroomLog).set(20, 186, Tile.MushroomLogSeeded);
  b.setDetail(14, 131, Detail.Mushroom).setDetail(25, 170, Detail.Mushroom);
  b.setDetail(10, 158, Detail.Mushroom).setDetail(30, 145, Detail.Pebbles);
  b.setDetail(19, 147, Detail.Pebbles).setDetail(8, 176, Detail.Tuft);
  // Alder's hut, door east toward the copse road.
  b.building(20, 156, 10, 9, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 4 }],
    windows: [{ side: 'n', at: 5 }, { side: 's', at: 5 }, { side: 'w', at: 4 }],
  });
  b.set(21, 157, Tile.Bed).set(21, 158, Tile.Bed);
  b.set(21, 162, Tile.Hearth);
  b.set(24, 157, Tile.Cabinet);
  b.set(24, 161, Tile.Table).set(25, 161, Tile.Chair);
  b.set(27, 157, Tile.ToolRack);
  b.setDetail(23, 159, Detail.RugRound);
  b.setDetail(28, 160, Detail.Doormat);
  b.setDetail(22, 156, herbBundlesDetail(1));
  b.setDetail(26, 164, trellisDetail(2));
  // THE LOG YARD — the trade itself, ranked where the road can take it.
  b.fillRect(31, 154, 8, 12, Tile.Dirt);
  b.set(32, 155, Tile.FelledLog).set(33, 155, Tile.FelledLog);
  b.set(32, 158, Tile.LogPile).set(35, 158, Tile.LogPileEndOn);
  b.set(32, 161, Tile.ChoppingBlock);
  b.set(35, 161, Tile.Woodpile).set(36, 161, Tile.Woodpile);
  b.set(37, 155, Tile.HandCart);
  b.set(33, 164, Tile.Sawhorse);
  b.setDetail(34, 160, Detail.Sawdust).setDetail(33, 157, Detail.Sawdust);
  b.setDetail(36, 163, Detail.Sawdust);
  b.set(30, 152, awningTile('board', 6));
  b.set(30, 151, Tile.WallWood).set(31, 151, Tile.WallWood);
  b.sign(38, 152, 'THE COPSE', ['Take the marked ones.', 'A stand outlives its keeper.'], Tile.Signpost);
  // THE SCRAP CRAG — copper and tin in the open, at pick height.
  b.set(12, 206, Tile.Rock).set(28, 210, Tile.Rock).set(20, 216, Tile.Rock);
  b.set(14, 208, Tile.RockCopper).set(25, 206, Tile.RockCopper);
  b.set(18, 212, Tile.RockTin).set(30, 214, Tile.RockTin);
  b.setDetail(16, 210, Detail.Pebbles).setDetail(26, 209, Detail.Pebbles);
  b.setDetail(22, 214, Detail.Pebbles).setDetail(13, 211, Detail.Pebbles);
  b.set(24, 219, Tile.MineCart);
  b.sign(22, 204, 'THE SCRAP CRAG', ['Copper and tin, honest seams.', "Ottery's furnace is hungry."], Tile.Signpost);

  // ================================================================
  // THE OLD GRANARY — the roofless ruin in the south-east meadow.
  // Hobb's people stored grain here before the family took the road to
  // Amberford market; the rats hold it now, in open daylight, visible
  // from the old road. The village chest waits for whoever thins them.
  // ================================================================
  b.fillRect(139, 158, 16, 12, Tile.Dirt);
  b.outlineRect(138, 157, 18, 14, Tile.WallStone);
  b.set(146, 157, Tile.Grass).set(147, 157, Tile.Grass); // the doorway went with the roof
  b.set(142, 170, Tile.Grass).set(143, 170, Tile.Grass); // the south wall sags open
  b.set(155, 163, Tile.Grass).set(155, 164, Tile.Grass); // and the east one too
  // A ROOFLESS RUIN GROWS THINGS. Weeds have the floor; the rats came
  // for what the weeds did not take.
  for (const [wx, wy] of [
    [140, 160], [143, 166], [149, 159], [152, 167], [145, 162], [153, 161],
  ] as const) b.set(wx, wy, Tile.GrassTall);
  for (const [wx, wy] of [
    [141, 165], [148, 168], [151, 163], [142, 159], [150, 165], [146, 159], [154, 166],
  ] as const) b.set(wx, wy, Tile.Grass);
  b.set(139, 158, Tile.Crate).set(154, 169, Tile.Barrel);
  b.set(147, 164, Tile.ChestWood);
  b.set(141, 161, Tile.BurialUrns).set(152, 159, Tile.CaveRubble);
  b.set(144, 168, Tile.GrainSacks).set(150, 161, Tile.CaveRubble);
  b.set(143, 163, Tile.BarrelStack).set(153, 157, Tile.CaveRubble);
  b.setDetail(147, 161, Detail.Mushroom).setDetail(144, 166, Detail.Mushroom);
  b.setDetail(143, 160, Detail.Straw).setDetail(149, 166, Detail.Straw);
  b.setDetail(152, 162, Detail.Straw).setDetail(141, 167, Detail.Straw);
  b.setDetail(148, 160, Detail.Straw);
  // The meadow the rats claimed: long grass, the old fence leaning in.
  b.set(134, 172, Tile.Fence).set(135, 172, Tile.Fence).set(136, 173, Tile.Fence);
  b.set(158, 174, Tile.Stump);
  for (const [gx, gy] of [
    [134, 160], [136, 166], [157, 158], [157, 168], [140, 176], [150, 178],
    [132, 154], [145, 152], [155, 152], [160, 178], [136, 182], [148, 184],
  ] as const) b.set(gx, gy, Tile.GrassTall);
  b.setDetail(138, 175, Detail.Mushroom).setDetail(152, 176, Detail.Straw);
  b.setDetail(144, 155, Detail.Pebbles);
  b.sign(136, 152, 'THE OLD GRANARY', ['Rats took the roof year before', 'last. Wakers: have at them.'], Tile.Signpost);

  // ================================================================
  // THE BROOK — down from the north wood, under the lane bridge, past
  // the crab bank, over the wading ford, and out the south hem.
  // Shallows line every reach so nothing ever traps a waker on the
  // wrong bank.
  // ================================================================
  for (let y = 0; y < 224; y++) {
    const cx = brookX(y);
    b.set(cx - 2, y, Tile.WaterShallow);
    b.set(cx - 1, y, Tile.Water);
    b.set(cx, y, Tile.Water);
    b.set(cx + 1, y, Tile.Water);
    b.set(cx + 2, y, Tile.WaterShallow);
  }
  // The lane bridge: ONE rectangle centred on the brook at the lane's
  // middle row (spans-are-rectangles law).
  {
    const bcx = brookX(112);
    for (let y = 110; y <= 114; y++) {
      for (let x = bcx - 3; x <= bcx + 3; x++) b.set(x, y, Tile.Bridge);
    }
  }
  b.set(155, 108, Tile.BannerPole).set(155, 116, Tile.BannerPole);
  b.set(166, 108, Tile.BannerPole).set(166, 116, Tile.BannerPole);
  // The ford: knee-deep the whole way across — the honest shortcut
  // between the granary meadow and the east wold.
  for (let y = 148; y <= 151; y++) {
    const cx = brookX(y);
    for (let x = cx - 1; x <= cx + 1; x++) b.set(x, y, Tile.WaterShallow);
  }
  for (let x = 152; x <= 156; x++) b.set(x, 150, Tile.Dirt);
  for (let x = 163; x <= 170; x++) b.set(x, 150, Tile.Dirt);
  b.setDetail(154, 149, Detail.Pebbles).setDetail(165, 151, Detail.Pebbles);
  // Weir's pier: planks off the near bank, out over the deep water,
  // with a widened head at the end where a man can actually stand.
  for (let x = 154; x <= 159; x++) b.set(x, 46, Tile.Dock);
  for (let x = 158; x <= 159; x++) b.set(x, 45, Tile.Dock).set(x, 47, Tile.Dock);
  b.set(154, 45, Tile.MooringPost).set(157, 44, Tile.MooringPost);
  b.set(154, 47, Tile.CatchBasket);
  b.set(155, 44, Tile.KeepPool);
  // Fishing spots where the water sounds busiest.
  b.set(161, 20, Tile.FishingSpot);
  b.set(159, 62, Tile.FishingSpot);
  b.set(161, 128, Tile.FishingSpot);
  b.set(159, 190, Tile.FishingSpot);
  // Willows lean over the water, clear of every path and node.
  b.set(156, 34, Tile.TreeWillow);
  b.set(165, 78, Tile.TreeWillow);
  b.set(156, 168, Tile.TreeWillow);
  b.set(164, 204, Tile.TreeWillow);

  // ================================================================
  // THE BERRY BANKS — the foraging lesson, on the near bank south of
  // the bridge where Berrit sends you: berries, the tall fibre plants,
  // sageroot and moonbell, each standing in open sun.
  // ================================================================
  for (const [bx, by] of [
    [152, 120], [149, 126], [154, 131], [150, 136], [153, 141], [147, 133], [151, 146],
  ] as const) b.set(bx, by, Tile.BerryBush);
  b.set(148, 122, Tile.FibrePlant).set(152, 138, Tile.FibrePlant).set(146, 143, Tile.FibrePlant);
  b.set(150, 118, Tile.WildSagewort).set(155, 135, Tile.WildSagewort);
  b.set(147, 148, Tile.WildMoonbell);
  b.setDetail(151, 124, Detail.Tuft).setDetail(148, 139, Detail.Tuft);
  // A last pair upstream for the wanderers.
  b.set(154, 92, Tile.BerryBush).set(152, 60, Tile.WildSagewort);

  // ================================================================
  // THE CRAB BANK — the far shore spreads into sand shoals where the
  // mudcrabs sun themselves in the OPEN, readable from the near bank.
  // ================================================================
  b.fillEllipse(174, 44, 9, 12, Tile.Sand);
  b.fillEllipse(180, 60, 7, 6, Tile.Sand);
  b.fillEllipse(172, 30, 6, 5, Tile.Sand);
  b.fillEllipse(173, 38, 2, 1, Tile.WaterShallow); // the warm pool
  b.fillEllipse(179, 58, 2, 1, Tile.WaterShallow); // and the cold one
  b.set(170, 26, Tile.ShellMidden).set(183, 50, Tile.ShellMidden);
  b.set(178, 36, Tile.ReedShelter);
  b.set(185, 42, Tile.Rock).set(168, 54, Tile.Rock);
  b.setDetail(172, 42, Detail.Pebbles).setDetail(178, 48, Detail.Pebbles);
  b.setDetail(176, 56, Detail.Pebbles).setDetail(170, 34, Detail.Pebbles);
  b.set(186, 30, Tile.GrassTall).set(167, 44, Tile.GrassTall);
  b.set(188, 62, Tile.GrassTall).set(172, 68, Tile.GrassTall);
  b.sign(176, 70, 'THE CRAB BANK', ['Mudcrabs sun on the sand.', 'They pinch. Pinch first.'], Tile.Signpost);

  // ================================================================
  // THE FIRST ROAD GATE — the send-off. The last lamps, the waymarker,
  // and the stone bench every waker who ever left sat on for a minute.
  // ================================================================
  b.set(172, 109, Tile.LampPost).set(172, 115, Tile.LampPost);
  b.set(184, 109, Tile.LampPost).set(184, 115, Tile.LampPost);
  b.set(178, 109, Tile.StoneBench);
  b.set(178, 115, Tile.WayShrine);
  // THE THRESHOLD — two old stones flank the road where the village's
  // last lamp gives out. Nobody built a gate here; the stones ARE it.
  b.set(189, 109, Tile.PillarStone).set(189, 115, Tile.PillarStone);
  b.set(186, 110, Tile.Rock); // the milestone, worn past reading
  b.set(180, 117, Tile.WayfarersRest);
  b.setDetail(187, 111, Detail.Pebbles).setDetail(188, 114, Detail.Pebbles);
  b.set(185, 108, bannerPoleTile(3)).set(185, 116, bannerPoleTile(5));
  b.setDetail(180, 110, Detail.Pebbles).setDetail(175, 114, Detail.Pebbles);
  b.sign(182, 116, 'THE FIRST ROAD', ['Amberford, a day east.', 'Waystations at every lamp.'], Tile.Signpost);
  // The east wold: open country across the water, hedgerow and oaks.
  for (let y = 84; y <= 100; y++) b.set(178, y, Tile.Hedge);
  for (let x = 178; x <= 188; x++) b.set(x, 84, Tile.Hedge);
  b.set(178, 92, Tile.HedgeGate);
  b.set(170, 90, Tile.TreeOak).set(186, 76, Tile.TreeOak).set(174, 122, Tile.TreeOak);
  b.set(182, 134, Tile.TreeOak).set(170, 160, Tile.TreeOak).set(186, 176, Tile.TreeOak);
  b.set(176, 146, Tile.GrassTall).set(184, 158, Tile.GrassTall);
  b.set(168, 130, Tile.GrassTall).set(190, 120, Tile.GrassTall);
  b.setDetail(180, 128, Detail.Flowers).setDetail(172, 172, Detail.Flowers);
  b.setDetail(188, 96, Detail.Flowers);

  // ================================================================
  // THE QUIET QUARTERS — every corner holds a vignette, no voids.
  // ================================================================
  // The rocky hem north-west of the orchard, where the rams come down.
  b.set(18, 24, Tile.Rock).set(24, 30, Tile.Rock).set(12, 34, Tile.Rock);
  b.set(30, 20, Tile.Rock).set(8, 44, Tile.Rock);
  b.setDetail(20, 27, Detail.Mushroom).setDetail(14, 32, Detail.Pebbles);
  b.setDetail(26, 22, Detail.Pebbles).setDetail(10, 40, Detail.Pebbles);
  b.set(16, 38, Tile.GrassTall).set(26, 44, Tile.GrassTall);
  b.set(20, 56, Tile.TreeOak).set(30, 62, Tile.TreeOak).set(12, 68, Tile.TreeOak);
  b.setDetail(24, 60, Detail.Flowers).setDetail(16, 64, Detail.Flowers);
  // The high meadow under the north wood, where the stags browse.
  b.set(112, 8, Tile.GrassTall).set(126, 10, Tile.GrassTall);
  b.set(140, 6, Tile.GrassTall).set(150, 12, Tile.GrassTall);
  b.setDetail(120, 6, Detail.Flowers).setDetail(134, 12, Detail.Flowers);
  b.setDetail(146, 8, Detail.Flowers);
  b.set(144, 20, Tile.TreeOak).set(154, 16, Tile.TreeOak);
  // The south meadow between the yard and the hem.
  b.set(96, 200, Tile.GrassTall).set(104, 208, Tile.GrassTall);
  b.set(118, 196, Tile.GrassTall).set(126, 210, Tile.GrassTall);
  b.set(112, 204, Tile.TreeOak).set(130, 200, Tile.TreeOak);
  b.setDetail(100, 204, Detail.Flowers).setDetail(122, 202, Detail.Flowers);
  b.setDetail(114, 212, Detail.Flowers);

  // Meadow life.
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.05);
  b.scatterDetail(Detail.Tuft, 0.06);

  // ================================================================
  // Edge woods: dense at the rim, thinning inward, and standing well
  // off every worked place.
  // ================================================================
  const KEEP_OUT: ReadonlyArray<readonly [number, number, number, number]> = [
    [70, 88, 100, 140],   // the Ring and the keeper's way
    [80, 76, 112, 108],   // the cottage row
    [104, 100, 160, 128], // the green, the inn's forecourt, the works
    [92, 10, 145, 70],    // the farmstead and its fields
    [88, 60, 145, 92],    // the common pasture
    [40, 24, 100, 80],    // the orchard and its walk
    [54, 0, 66, 30],      // the hunters' trail
    [92, 20, 100, 60],    // the orchard walk
    [80, 114, 115, 200],  // the muster court, the pell yard, the lodge
    [36, 148, 90, 192],   // the long butts and the fletcher's shed
    [38, 186, 96, 220],   // the spark circle
    [0, 112, 44, 224],    // the copse and the crag
    [134, 24, 162, 96],   // the fishery and the drover yard
    [134, 112, 165, 192], // the berry banks and the granary
    [162, 20, 191, 80],   // the crab bank
    [162, 100, 191, 126], // the road gate
    [102, 112, 114, 224], // the old-road spur
    [106, 190, 140, 220], // the south meadow
    [30, 130, 42, 160],   // the copse road
  ];
  const inKeepOut = (x: number, y: number): boolean =>
    KEEP_OUT.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 192; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 112) <= 4 && x >= 66) continue; // the lane breathes
      if (inKeepOut(x, y)) continue;
      const edge = Math.min(x, y, 191 - x, 223 - y);
      const density = edge < 5 ? 0.4 : edge < 12 ? 0.14 : 0.01;
      if (meadRng(x, y) < density) b.set(x, y, edge < 5 && meadRng(y, x) < 0.3 ? Tile.TreeOak : Tile.Tree);
    }
  }

  // ================================================================
  // The animals and the lessons: penned hens and herd beasts, the
  // granary rats and the bank crabs — the village's whole syllabus of
  // first combat and first produce, all of it in the open.
  // ================================================================
  b.npcSpawn('chicken', 107.5, 56.5, 4, 5);
  // THE HEARTH'S SHADOW: the coop mouser, and one working cat posted
  // where the granary rats actually are.
  b.npcSpawn('cat', 118.5, 52.5, 2.5, 1);
  b.npcSpawn('cat', 136.5, 166.5, 3, 1);
  b.npcSpawn('cow', 106.5, 74.5, 4, 2);
  b.npcSpawn('sheep', 128.5, 74.5, 4, 3);
  b.npcSpawn('rat', 147.5, 166.5, 3, 3);
  b.npcSpawn('rat', 141.5, 176.5, 3, 2);
  b.npcSpawn('rat', 156.5, 156.5, 3, 2);
  b.npcSpawn('mudcrab', 174.5, 44.5, 4, 3);
  b.npcSpawn('mudcrab', 180.5, 60.5, 3, 2);

  // ================================================================
  // The villagers — sixteen lives, each keeping the hours of a routine
  // whose coordinates hang off these posts (the post-is-the-origin
  // law: move a post, and the life moves).
  // ================================================================
  // Wren waits beside the Ring for wakers, as Rowan asked her to.
  b.actor('keeper_wren', 92.5, 110.5, Math.PI, 'wren_hours');
  // Halla drills the yard; the pell line stands where she can see it.
  b.actor('yardmaster_halla', 93.5, 162.5, -Math.PI / 2, 'halla_rounds');
  // Rill keeps the butts, shooting east down her own lane.
  b.actor('fletcher_rill', 48.5, 160.5, 0, 'rill_hours');
  // Varn keeps the spark circle and loses whole afternoons in it.
  b.actor('sparkwright_varn', 74.5, 198.5, Math.PI / 2, 'varn_hours');
  // Alder works the copse at a tree's own pace.
  b.actor('forester_alder', 33.5, 159.5, Math.PI, 'alder_hours');
  // Berrit owns the cookhouse the way captains own ships.
  b.actor('cook_berrit', 131.5, 129.5, -Math.PI / 2, 'berrit_hours');
  // Ottery taps away at the bench between the saw and the forge.
  b.actor('wright_ottery', 139.5, 99.5, -Math.PI / 2, 'ottery_hours');
  // Gilly keeps the bar at the Five Stones.
  b.actor('innkeep_gilly', 116.5, 88.5, Math.PI / 2, 'gilly_hours');
  // Weir is on his pier. Weir is always on his pier.
  b.actor('angler_weir', 156.5, 46.5, Math.PI / 2, 'weir_hours');
  // Brammel minds the field and the weather, in that order.
  b.actor('farmer_brammel', 112.5, 26.5, Math.PI / 2, 'brammel_hours');
  // Sorrel keeps the stalls and talks to the animals more than the
  // owners.
  b.actor('drover_sorrel', 144.5, 74.5, Math.PI, 'sorrel_hours');
  // The twins orbit the green at a dead run until bedtime.
  b.actor('twin_tansy', 118.5, 111.5, 0, 'tansy_scamp');
  b.actor('twin_wick', 128.5, 115.5, Math.PI, 'wick_scamp');
  // THE VALE WARDS — Halla's rota, three bodies and one hot bunk: the
  // bridge by day, the green by night, the granary meadow at dusk.
  // There is always a lantern moving somewhere in Dawnmead.
  b.actor('dawnmead_ward', 151.5, 112.5, 0, 'dawn_ward_day');
  b.actor('dawnmead_ward', 122.5, 114.5, Math.PI / 2, 'dawn_ward_night');
  b.actor('dawnmead_ward', 134.5, 154.5, Math.PI / 2, 'dawn_ward_dusk');

  b.spawn(78.5, 112.5);
  return b.build();
}

/** Stable per-tile randomness so the village is identical every boot. */
function meadRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x2f61a3b7;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
