import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  AWNING_HOST_TILES,
  AWNING_SHAPES,
  AWNING_TILES,
  CHEST_TILES,
  DIAG_WALL_TILES,
  DOOR_TILES,
  DYE_COUNT,
  FENCE_TILES,
  GARRISON_TILES,
  HANGABLE_WALL_TILES,
  HEDGE_TILES,
  INTERIOR_BOUNDARY_TILES,
  LIGHT_BLOCKING_TILES,
  PALISADE_TILES,
  SIGN_MOTIF_COUNT,
  SILL_MIX_COUNT,
  BUNDLE_MIX_COUNT,
  SILL_HOST_TILES,
  TRELLIS_SPECIES_COUNT,
  WALL_HUNG_DETAILS,
  WALL_RUN_TILES,
  Detail,
  Tile,
  awningInfo,
  awningTile,
  bannerPoleInfo,
  bannerPoleTile,
  bracketSignDetail,
  pennantDetail,
  trellisDetail,
  sillHerbsDetail,
  herbBundlesDetail,
  hangHostTiles,
  wallBannerDetail,
  wallHungInfo,
  chestInfo,
  closedChestTile,
  destructibleInfo,
  DESTRUCTIBLE_TILES,
  diagWallInfo,
  doorInfo,
  nearestFloorTile,
  openChestTile,
  openDoorTile,
  orientDiagFence,
  orientDiagHedge,
  orientDiagPalisade,
  orientDiagWall,
  shutDoorTile,
  tileDef,
  type ChestKind,
} from './tiles.js';

const KINDS: readonly ChestKind[] = ['wood', 'mossy', 'iron', 'gilded', 'boss'];

test('every chest kind round-trips closed <-> open', () => {
  for (const kind of KINDS) {
    const closed = closedChestTile(kind);
    const open = openChestTile(kind);
    assert.notEqual(closed, open);
    assert.deepEqual(chestInfo(closed), { kind, open: false });
    assert.deepEqual(chestInfo(open), { kind, open: true });
    assert.ok(CHEST_TILES.has(closed));
    assert.ok(CHEST_TILES.has(open));
  }
});

test('chest tiles are solid props with defs', () => {
  for (const tile of CHEST_TILES) {
    const def = tileDef(tile);
    assert.ok(def.solid, `${def.name} must block movement`);
    assert.ok(def.raised, `${def.name} renders as a raised prop`);
  }
});

test('non-chest tiles report null', () => {
  assert.equal(chestInfo(Tile.BankChest), null);
  assert.equal(chestInfo(Tile.Crate), null);
});

test('every doorway round-trips open <-> shut', () => {
  for (const tile of DOOR_TILES) {
    const info = doorInfo(tile)!;
    const shut = shutDoorTile(tile)!;
    const open = openDoorTile(tile)!;
    assert.notEqual(shut, open);
    // Identity on the matching posture, counterpart on the other.
    assert.equal(info.open ? open : shut, tile);
    assert.deepEqual(doorInfo(shut), { ...info, open: false });
    assert.deepEqual(doorInfo(open), { ...info, open: true });
  }
});

test('door posture drives solidity and lamplight', () => {
  for (const tile of DOOR_TILES) {
    const info = doorInfo(tile)!;
    assert.equal(tileDef(tile).solid, !info.open, `${tileDef(tile).name} solidity`);
    if (info.material === 'fence') {
      // THE GATE CARVE-OUT: a fence gate rides the door machinery but
      // it is a waist-high slatted prop — never a wall member (a pen
      // must not become a "room") and never a lamplight blocker.
      assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} stays out of wall runs`);
      assert.ok(
        !LIGHT_BLOCKING_TILES.includes(tile),
        `${tileDef(tile).name} never blocks lamplight`,
      );
      continue;
    }
    if (info.material === 'garrison') {
      // THE SEPARATE-MASONRY LAW: the gatehouse belongs to the
      // garrison run family, never to building walls — and unlike a
      // fence gate its shut leaves are full-height lamplight mass.
      assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} stays out of wall runs`);
      assert.ok(GARRISON_TILES.has(tile), `${tileDef(tile).name} joins the garrison family`);
      assert.equal(
        LIGHT_BLOCKING_TILES.includes(tile),
        !info.open,
        `${tileDef(tile).name} lamplight`,
      );
      continue;
    }
    if (info.material === 'palisade') {
      // The camp gate carves out the same way: it belongs to the
      // spiked-wall family, and its shut leaf is full-height lashed
      // logs — lamplight mass like the garrison's, prop like the
      // fence's.
      assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} stays out of wall runs`);
      assert.ok(PALISADE_TILES.has(tile), `${tileDef(tile).name} joins the palisade family`);
      assert.equal(
        LIGHT_BLOCKING_TILES.includes(tile),
        !info.open,
        `${tileDef(tile).name} lamplight`,
      );
      continue;
    }
    if (info.material === 'hedge') {
      // The garden wicket carves out like the fence gate: it belongs
      // to the hedge family, and even shut it is a waist-high timber
      // leaf in a hip-high hedgerow — never lamplight mass (the
      // towering living arch died in round four as out of scale).
      assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} stays out of wall runs`);
      assert.ok(HEDGE_TILES.has(tile), `${tileDef(tile).name} joins the hedge family`);
      assert.ok(
        !LIGHT_BLOCKING_TILES.includes(tile),
        `${tileDef(tile).name} never blocks lamplight`,
      );
      continue;
    }
    assert.equal(
      LIGHT_BLOCKING_TILES.includes(tile),
      !info.open,
      `${tileDef(tile).name} lamplight`,
    );
    // Open or shut, a doorway stays in its wall run — toggling must
    // never re-shape the building around it.
    assert.ok(WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} joins wall runs`);
  }
});

test('palisade family: the spiked wall stands apart and its gate rounds the trip', () => {
  assert.deepEqual(doorInfo(Tile.PalisadeGate), { material: 'palisade', wide: false, open: true });
  assert.deepEqual(doorInfo(Tile.PalisadeGateShut), {
    material: 'palisade',
    wide: false,
    open: false,
  });
  assert.equal(shutDoorTile(Tile.PalisadeGate), Tile.PalisadeGateShut);
  assert.equal(openDoorTile(Tile.PalisadeGateShut), Tile.PalisadeGate);
  for (const tile of PALISADE_TILES) {
    assert.ok(tileDef(tile).raised, `${tileDef(tile).name} renders raised`);
    // Only the open gate lets a body through.
    assert.equal(tileDef(tile).solid, tile !== Tile.PalisadeGate, `${tileDef(tile).name} solidity`);
    // THE SEPARATE-MASONRY LAW, third family: never a building wall,
    // never a fence, never garrison masonry.
    assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} out of wall runs`);
    assert.ok(!FENCE_TILES.has(tile), `${tileDef(tile).name} out of the fence family`);
    assert.ok(!GARRISON_TILES.has(tile), `${tileDef(tile).name} out of the garrison family`);
  }
  // Head-high logs hide the camp; the open gate spills firelight.
  for (const tile of [Tile.Palisade, Tile.PalisadeDiagNE, Tile.PalisadeDiagNW]) {
    assert.ok(LIGHT_BLOCKING_TILES.includes(tile), `${tileDef(tile).name} blocks lamplight`);
  }
  // The 45° turn joins whichever diagonal already carries the wall.
  assert.equal(orientDiagPalisade(true, false, false, false), Tile.PalisadeDiagNE);
  assert.equal(orientDiagPalisade(false, false, false, true), Tile.PalisadeDiagNE);
  assert.equal(orientDiagPalisade(false, true, false, false), Tile.PalisadeDiagNW);
  assert.equal(orientDiagPalisade(false, false, true, false), Tile.PalisadeDiagNW);
});

test('hedge family: the clipped green stands apart and its arch rounds the trip', () => {
  assert.deepEqual(doorInfo(Tile.HedgeGate), { material: 'hedge', wide: false, open: true });
  assert.deepEqual(doorInfo(Tile.HedgeGateShut), {
    material: 'hedge',
    wide: false,
    open: false,
  });
  assert.equal(shutDoorTile(Tile.HedgeGate), Tile.HedgeGateShut);
  assert.equal(openDoorTile(Tile.HedgeGateShut), Tile.HedgeGate);
  for (const tile of HEDGE_TILES) {
    assert.ok(tileDef(tile).raised, `${tileDef(tile).name} renders raised`);
    // Only the open arch lets a body walk the path beneath it.
    assert.equal(tileDef(tile).solid, tile !== Tile.HedgeGate, `${tileDef(tile).name} solidity`);
    // THE SEPARATE-MASONRY LAW, fourth family: never a building wall,
    // never a fence, never garrison masonry, never the camp's logs —
    // clipped green merges only with its own kind.
    assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} out of wall runs`);
    assert.ok(!FENCE_TILES.has(tile), `${tileDef(tile).name} out of the fence family`);
    assert.ok(!GARRISON_TILES.has(tile), `${tileDef(tile).name} out of the garrison family`);
    assert.ok(!PALISADE_TILES.has(tile), `${tileDef(tile).name} out of the palisade family`);
    assert.ok(
      !INTERIOR_BOUNDARY_TILES.includes(tile),
      `${tileDef(tile).name} never encloses a room`,
    );
  }
  // THE WAIST LAW: the hedgerow runs hip-high — lamplight clears
  // EVERY hedge tile like it clears a fence. The gate's towering
  // arch died in round four (out of scale over a waist-high garden);
  // a shut timber wicket is no lamplight mass either.
  for (const tile of HEDGE_TILES) {
    assert.ok(!LIGHT_BLOCKING_TILES.includes(tile), `${tileDef(tile).name} clears lamplight`);
  }
  // The 45° turn joins whichever diagonal already carries the hedge.
  assert.equal(orientDiagHedge(true, false, false, false), Tile.HedgeDiagNE);
  assert.equal(orientDiagHedge(false, false, false, true), Tile.HedgeDiagNE);
  assert.equal(orientDiagHedge(false, true, false, false), Tile.HedgeDiagNW);
  assert.equal(orientDiagHedge(false, false, true, false), Tile.HedgeDiagNW);
  assert.equal(orientDiagHedge(false, false, false, false), Tile.HedgeDiagNE);
});

test('fence family: gates round-trip and diagonals stay solid', () => {
  // The gate is a door of material 'fence' — the whole door pipeline
  // (interact, locks, occupancy, auto-close) serves it unchanged.
  assert.deepEqual(doorInfo(Tile.FenceGate), { material: 'fence', wide: false, open: true });
  assert.deepEqual(doorInfo(Tile.FenceGateShut), { material: 'fence', wide: false, open: false });
  assert.equal(shutDoorTile(Tile.FenceGate), Tile.FenceGateShut);
  assert.equal(openDoorTile(Tile.FenceGateShut), Tile.FenceGate);
  for (const tile of FENCE_TILES) {
    assert.ok(tileDef(tile).raised, `${tileDef(tile).name} renders raised`);
    // Only the open gate lets a body through.
    assert.equal(tileDef(tile).solid, tile !== Tile.FenceGate, `${tileDef(tile).name} solidity`);
  }
  // The 45° turn joins whichever diagonal already carries fencing.
  assert.equal(orientDiagFence(true, false, false, false), Tile.FenceDiagNE);
  assert.equal(orientDiagFence(false, false, false, true), Tile.FenceDiagNE);
  assert.equal(orientDiagFence(false, true, false, false), Tile.FenceDiagNW);
  assert.equal(orientDiagFence(false, false, true, false), Tile.FenceDiagNW);
  assert.equal(orientDiagFence(false, false, false, false), Tile.FenceDiagNE);
});

test('garrison family: the separate-masonry law holds', () => {
  // The whole family stands apart from building walls: no member
  // merges into a house run and none bounds an interior region —
  // a walled bailey is open sky, not a room.
  for (const tile of GARRISON_TILES) {
    assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} out of wall runs`);
    assert.ok(
      !INTERIOR_BOUNDARY_TILES.includes(tile),
      `${tileDef(tile).name} never encloses a room`,
    );
    // Only the open gate lets a body through the curtain.
    assert.equal(tileDef(tile).solid, tile !== Tile.GateGarrison, `${tileDef(tile).name} solidity`);
  }
  // Solid curtain mass blocks lamplight; the open passage spills it.
  assert.ok(LIGHT_BLOCKING_TILES.includes(Tile.WallGarrison));
  assert.ok(!LIGHT_BLOCKING_TILES.includes(Tile.GateGarrison));
  // The gate rides the door law, wide by construction, and
  // round-trips its postures.
  assert.deepEqual(doorInfo(Tile.GateGarrison), { material: 'garrison', wide: true, open: true });
  assert.equal(shutDoorTile(Tile.GateGarrison), Tile.GateGarrisonShut);
  assert.equal(openDoorTile(Tile.GateGarrisonShut), Tile.GateGarrison);
  // The 45° turns carry material + mass and auto-orient like every
  // diagonal wall — and they are diag-wall members (terrain's
  // exterior-ground rule and lamplight both key off that set).
  assert.deepEqual(diagWallInfo(Tile.WallGarrisonDiagSW), { material: 'garrison', mass: 'SW' });
  assert.ok(DIAG_WALL_TILES.has(Tile.WallGarrisonDiagNE));
  assert.equal(orientDiagWall('garrison', true, true, false, false), Tile.WallGarrisonDiagNE);
  assert.equal(orientDiagWall('garrison', false, false, true, true), Tile.WallGarrisonDiagSW);
});

test('non-door tiles report null', () => {
  assert.equal(doorInfo(Tile.WallWood), null);
  assert.equal(doorInfo(Tile.ArchStone), null);
  assert.equal(shutDoorTile(Tile.WallStone), null);
  assert.equal(openDoorTile(Tile.WallStone), null);
});

// ------------------------------------------------- destructible props

test('the smashable props carry a break-up kind, respawn law, and durability', () => {
  const expect: Array<[Tile, string, number]> = [
    [Tile.Barrel, 'barrel', 1],
    [Tile.Crate, 'crate', 1],
    [Tile.CrateGoods, 'goods', 2],
    [Tile.Chair, 'chair', 1],
    [Tile.Table, 'table', 3],
    [Tile.Bench, 'bench', 2],
    // The dungeon pair: bones scatter on a kick; the cracked wall is
    // the secret-door law — three blows open the hidden room.
    [Tile.BonePile, 'bonepile', 1],
    [Tile.CrackedCaveWall, 'crackedwall', 3],
    // THE CAMP BARES ITS TEETH: the war camp is an obstacle course.
    // Walls hold four blows; the road-blocker two; dressing pops in
    // one or two. Palisade gates + the bonfire are deliberately NOT
    // here (door law / a fire is doused, not smashed).
    [Tile.Palisade, 'palisade', 4],
    [Tile.PalisadeDiagNE, 'palisade', 4],
    [Tile.PalisadeDiagNW, 'palisade', 4],
    [Tile.StandingTorch, 'torch', 1],
    [Tile.WarBrazier, 'brazier', 2],
    [Tile.TentHide, 'tent', 3],
    [Tile.TentWar, 'tent', 3],
    [Tile.SkullPile, 'skulls', 1],
    [Tile.SkullTotem, 'totem', 2],
    [Tile.WarBanner, 'banner', 2],
    [Tile.PrisonCage, 'cage', 3],
    [Tile.SpikeBarrier, 'stakes', 2],
    [Tile.MeatSpit, 'spit', 2],
    [Tile.MeatRack, 'meatrack', 2],
    [Tile.CookPot, 'pot', 2],
    [Tile.PotionRack, 'potions', 1],
    [Tile.BeastNest, 'nest', 1],
    [Tile.PlunderSacks, 'sacks', 2],
    [Tile.SpearRack, 'spears', 2],
    [Tile.TargetDummy, 'dummy', 3],
    [Tile.WarDrum, 'drum', 2],
    [Tile.HideFrame, 'hide', 2],
    // THE FAIR HOUSE FURNISHED: finery breaks fast, stone and mithril
    // stand long. The Everflame is deliberately NOT here (the bonfire
    // law — a flame this old is not put out by a stick).
    [Tile.ArcaneBeacon, 'beacon', 2],
    [Tile.ElvenBanner, 'elfbanner', 2],
    [Tile.ElvenBench, 'elfbench', 2],
    [Tile.ElvenTable, 'elftable', 2],
    [Tile.ElvenChair, 'elfchair', 1],
    [Tile.ElvenDaybed, 'daybed', 2],
    [Tile.ElvenBookcase, 'bookcase', 3],
    [Tile.ElvenLectern, 'lectern', 1],
    [Tile.ElvenHarp, 'harp', 2],
    [Tile.ElvenLoom, 'loom', 2],
    [Tile.ElvenFountain, 'fountain', 4],
    [Tile.ElvenStatue, 'statue', 4],
    [Tile.Moonwell, 'moonwell', 3],
    [Tile.MithrilAnvil, 'anvil', 4],
    [Tile.ElvenArmsRack, 'armsrack', 2],
    [Tile.ElvenPlanter, 'planter', 1],
    [Tile.ElvenMirror, 'mirror', 1],
    [Tile.ElvenWaystone, 'waystone', 4],
    [Tile.ElvenChimes, 'chimes', 1],
    // THE IMBUED LANE: old magic stands long, wild crystal cracks in
    // two, the floating book falls to one swat.
    [Tile.Runestone, 'runestone', 4],
    [Tile.CrystalCluster, 'crystals', 2],
    [Tile.WardArch, 'wardarch', 4],
    [Tile.ArcaneTome, 'tome', 1],
    [Tile.RunePillar, 'runepillar', 3],
    // THE CLIPPED GREEN: the showpieces burst in leaves. The hedge
    // WALL is deliberately NOT here — player-built garden
    // architecture comes down by the demolish lane, like the fence.
    // THE LONG DARK FURNISHED: rot pops in one blow, joined iron and
    // worked stone hold three or four.
    [Tile.MossBarrel, 'mossbarrel', 1],
    [Tile.MineCart, 'minecart', 3],
    [Tile.ChainedSkeleton, 'chainedbones', 1],
    [Tile.Sarcophagus, 'sarcophagus', 4],
    [Tile.BrokenPillar, 'brokenpillar', 3],
    [Tile.BurialUrns, 'urns', 1],
    [Tile.AncientStatue, 'oldstatue', 4],
    // THE LONG DARK PEOPLED: joined timber holds a beat, everything
    // a delver left pops in one.
    [Tile.GibbetCage, 'gibbet', 2],
    [Tile.Stocks, 'stocks', 2],
    [Tile.ColdCamp, 'coldcamp', 1],
    [Tile.LootedChest, 'lootchest', 1],
    [Tile.CandleShrine, 'candles', 1],
    // THE BANKS GET THEIR GOODS: lashed bank-stuff pops in a blow,
    // the hollowed hull and joined bone hold a few, and the great
    // ribs at four are the kit's hardest bones. The TideAltar is
    // deliberately NOT here (the tide keeps its own).
    [Tile.FishRack, 'fishrack', 1],
    [Tile.TideTotem, 'tidetotem', 3],
    [Tile.NetFrame, 'net', 1],
    [Tile.Dugout, 'dugout', 3],
    [Tile.HarpoonRack, 'harpoons', 2],
    [Tile.ShellMidden, 'midden', 1],
    [Tile.FishTrap, 'fishtrap', 1],
    [Tile.RoeNest, 'roe', 1],
    [Tile.LurePole, 'lure', 2],
    [Tile.CatchBasket, 'catch', 1],
    [Tile.WhaleRibs, 'greatribs', 4],
    // THE CRAFTSMEN OF THE BANKS: woven walls and worked joinery
    // hold a blow or three; lines, heaps, and crusts pop in one.
    [Tile.ReedShelter, 'shelter', 3],
    [Tile.SmokeTripod, 'smoker', 1],
    [Tile.MendingBench, 'mendbench', 2],
    [Tile.WeirPanels, 'weir', 2],
    [Tile.KelpLine, 'kelpline', 1],
    [Tile.SaltPan, 'saltpan', 1],
    [Tile.ShellBench, 'shellbench', 2],
    [Tile.WithyStore, 'withies', 1],
    [Tile.KeepPool, 'keeppool', 1],
    [Tile.TideChimes, 'shellchimes', 1],
    // THE TOWN KEEPS ITS DAY: street timber holds a blow or two,
    // civic masonry and bronze hold three or four.
    [Tile.TownFountain, 'townfountain', 4],
    [Tile.FounderStatue, 'founder', 4],
    [Tile.NoticeBoard, 'notices', 2],
    [Tile.TownBell, 'townbell', 3],
    [Tile.HandCart, 'handcart', 2],
    [Tile.GrainSacks, 'grainsacks', 1],
    [Tile.BarrelStack, 'barrelstack', 2],
    [Tile.CrateStack, 'cratestack', 2],
    [Tile.HitchingPost, 'hitchpost', 2],
    [Tile.Woodpile, 'woodpile', 1],
    [Tile.StreetPlanter, 'streetplanter', 1],
    [Tile.StoneBench, 'stonebench', 3],
    [Tile.ProduceStand, 'produce', 2],
    // THE TRADES KEEP SHOP: workshop timber like the street's; the
    // bread oven is the yard's masonry and holds four.
    [Tile.QuenchTrough, 'quench', 2],
    [Tile.Grindstone, 'grindstone', 2],
    [Tile.SmithBellows, 'bellows', 1],
    [Tile.IngotRack, 'ingots', 2],
    [Tile.LumberRack, 'lumber', 2],
    [Tile.DyeVats, 'dyevat', 2],
    [Tile.TailorsDummy, 'dressform', 1],
    [Tile.ClothBolts, 'clothbolts', 1],
    [Tile.BreadOven, 'breadoven', 4],
    [Tile.ButcherBlock, 'butcherblock', 2],
    [Tile.HerbRack, 'herbs', 1],
    [Tile.ShopShelf, 'shopshelf', 2],
    // THE SECOND SHIFT: street timber 1-2; carved limestone 3; the
    // kiln is the wave's masonry and holds four like the oven.
    [Tile.WallFountain, 'wallfountain', 3],
    [Tile.WaterCask, 'watercask', 2],
    [Tile.WaterTrough, 'watertrough', 2],
    [Tile.PottersWheel, 'potterswheel', 2],
    [Tile.PotteryKiln, 'kiln', 4],
    [Tile.ScribesDesk, 'scribedesk', 2],
    [Tile.CandleRack, 'candlerack', 1],
    [Tile.FletchersBench, 'fletcher', 2],
    [Tile.CobblersBench, 'cobbler', 1],
    [Tile.FishmongerSlab, 'fishslab', 2],
    [Tile.HangingScale, 'scales', 1],
    [Tile.DisplayTable, 'displaytable', 2],
    // THE COMMONS: street timber 1-2 like the town's; the wayside
    // stone holds three-and-four on the long clock; the clinker
    // skiff is forty seasons of hollow and holds three.
    [Tile.CandleStand, 'candlestand', 1],
    [Tile.StreetLantern, 'streetlantern', 1],
    [Tile.WayShrine, 'wayshrine', 3],
    [Tile.GuardianStatue, 'guardian', 4],
    [Tile.TapCask, 'tapcask', 2],
    [Tile.GameTable, 'gametable', 2],
    [Tile.WoodStool, 'stool', 1],
    [Tile.SettleBench, 'settle', 2],
    [Tile.BasketStack, 'baskets', 1],
    [Tile.GlazedJars, 'glazedjars', 1],
    [Tile.BroomAndPail, 'broompail', 1],
    [Tile.CloakStand, 'cloakstand', 1],
    [Tile.LeanLadder, 'ladder', 1],
    [Tile.Wheelbarrow, 'barrow', 2],
    [Tile.WayfarersRest, 'wayfarer', 1],
    [Tile.MooringPost, 'mooring', 2],
    [Tile.BeachedSkiff, 'skiff', 3],
    // THE WARREN AND THE LEGION: camp litter pops in one, lashed
    // work holds two, the stolen cart is the wave's barricade.
    [Tile.BoneMidden, 'gnawbones', 1],
    [Tile.TrophyStake, 'trophies', 2],
    [Tile.GrogTub, 'grogtub', 2],
    [Tile.KnucklePit, 'knuckles', 1],
    [Tile.RagNest, 'ragnest', 1],
    [Tile.BeastStake, 'beaststake', 2],
    [Tile.CritterCage, 'critters', 1],
    [Tile.AlarmGong, 'gong', 2],
    [Tile.WarTable, 'wartable', 2],
    [Tile.PlunderCart, 'plundercart', 3],
    [Tile.BossEffigy, 'effigy', 2],
    [Tile.GnawTrough, 'gnawtrough', 1],
    [Tile.HerbPlanter, 'herbplanter', 2],
    [Tile.ChoppingBlock, 'choppingblock', 2],
    // THE LOG YARD: whole trunks are the street kit's heaviest timber.
    [Tile.FelledLog, 'greatlog', 2],
    [Tile.LogPile, 'logdeck', 3],
    [Tile.LogPileEndOn, 'logstack', 3],
  ];
  assert.equal(DESTRUCTIBLE_TILES.size, expect.length);
  for (const [tile, kind, hits] of expect) {
    const info = destructibleInfo(tile);
    assert.equal(info?.kind, kind);
    // Durability is counted in HITS (scale-free): at least one, and
    // pinned per prop so a rebalance is a deliberate act.
    assert.equal(info!.hits, hits);
    assert.ok(info!.hits >= 1);
    // The absence must be worth enjoying, and never permanent. The
    // cracked wall runs long on purpose: a found passage stays found
    // for the whole run (instances die before it restands). A breached
    // palisade ring stays breached for the whole assault.
    const cap = kind === 'crackedwall' ? 3600 : kind === 'palisade' ? 900 : 600;
    assert.ok(info!.respawnSec >= 120 && info!.respawnSec <= cap);
    // Only SOLID clutter is smashable — bursting a walkable tile
    // would patch the floor out from under someone's feet.
    assert.ok(tileDef(tile).solid, `${tileDef(tile).name} is solid`);
  }
  // Bulk reads as bulk: the big joined table outlasts light clutter.
  assert.ok(destructibleInfo(Tile.Table)!.hits > destructibleInfo(Tile.Barrel)!.hits);
});

test('load-bearing scenery is not smashable', () => {
  for (const t of [
    Tile.WallWood,
    Tile.DoorwayWoodShut,
    Tile.ChestWood,
    Tile.Bed,
    Tile.Bookshelf,
    // The camp gate is the door law's; the bonfire never breaks.
    Tile.PalisadeGate,
    Tile.PalisadeGateShut,
    Tile.Bonfire,
    // The elven hall's flame holds the same law as the camp's fire.
    Tile.Everflame,
    // The garden arch is the door law's; the hedge wall is the
    // demolish lane's (player-built, like the fence).
    Tile.HedgeGate,
    Tile.HedgeGateShut,
    Tile.Hedge,
    Tile.HedgeDiagNE,
    Tile.HedgeDiagNW,
    // THE LONG DARK FURNISHED: the grand pillar holds the mountain up
    // (the bonfire law carried into stone); the wall fixtures are
    // bolted into it — a sconce is iron in living rock, and a chain
    // shrugs off a club.
    Tile.GrandPillar,
    Tile.WallSconce,
    Tile.WallChains,
    // THE LONG DARK PEOPLED: the mine brace holds the roof (the
    // grand pillar's law in timber); the ribs, the webs, the pool,
    // and the grate are the mountain's own — and walkable besides.
    Tile.TimberBrace,
    Tile.WallFossil,
    Tile.WallWeb,
    Tile.DripPool,
    Tile.IronGrate,
    // THE BANKS GET THEIR GOODS: the tide altar never breaks — the
    // bonfire law reaching the water. The sea placed it; the sea
    // keeps it.
    Tile.TideAltar,
  ]) {
    assert.equal(destructibleInfo(t), null);
  }
});

test('nearestFloorTile mirrors the underlay law: ring 1, ring 2, grass', () => {
  const world = (tiles: Record<string, Tile>) => (tx: number, ty: number) =>
    tiles[`${tx},${ty}`];
  // A neighboring floor wins outright.
  assert.equal(nearestFloorTile(world({ '0,1': Tile.WoodFloor }), 0, 0), Tile.WoodFloor);
  // A table ringed by its own chairs still finds the boards two out.
  assert.equal(
    nearestFloorTile(
      world({
        '0,1': Tile.Chair,
        '1,0': Tile.Chair,
        '-1,0': Tile.Chair,
        '0,-1': Tile.Chair,
        '0,2': Tile.StoneFloor,
      }),
      0,
      0,
    ),
    Tile.StoneFloor,
  );
  // Open air falls back to grass.
  assert.equal(nearestFloorTile(world({}), 0, 0), Tile.Grass);
});

// ---------------------------------------------------------------------------
// THE OUTWARD FACE — the second layer's truth tables.

test('wall-hung bands: wallHungInfo reads every id back exactly', () => {
  // The authored royals keep their standing identities.
  assert.deepEqual(wallHungInfo(Detail.BannerCrown), { kind: 'crown' });
  assert.deepEqual(wallHungInfo(Detail.BannerMoon), { kind: 'moon' });
  assert.deepEqual(wallHungInfo(Detail.Tapestry), { kind: 'tapestry' });
  // Every dyed banner and pennant round-trips through its builder.
  for (let dye = 0; dye < DYE_COUNT; dye++) {
    assert.deepEqual(wallHungInfo(wallBannerDetail(dye)), { kind: 'banner', dye });
    assert.deepEqual(wallHungInfo(pennantDetail(dye)), { kind: 'pennant', dye });
  }
  for (let motif = 0; motif < SIGN_MOTIF_COUNT; motif++) {
    assert.deepEqual(wallHungInfo(bracketSignDetail(motif)), { kind: 'sign', motif });
  }
  for (let species = 0; species < TRELLIS_SPECIES_COUNT; species++) {
    assert.deepEqual(wallHungInfo(trellisDetail(species)), { kind: 'trellis', species });
  }
  assert.deepEqual(wallHungInfo(Detail.WallBasket), { kind: 'basket' });
  // THE HERBALIST'S SHELF bands read back mix-true.
  for (let mix = 0; mix < SILL_MIX_COUNT; mix++) {
    assert.deepEqual(wallHungInfo(sillHerbsDetail(mix)), { kind: 'sill', mix });
  }
  for (let mix = 0; mix < BUNDLE_MIX_COUNT; mix++) {
    assert.deepEqual(wallHungInfo(herbBundlesDetail(mix)), { kind: 'bundles', mix });
  }
  // Ground details never read as hangings.
  for (const d of [Detail.None, Detail.Flowers, Detail.Rug, Detail.Doormat, Detail.CarpetRoyal]) {
    assert.equal(wallHungInfo(d), null, `detail ${d} stays on the ground`);
  }
  // Unused band slots stay dark until a dye is actually mixed.
  assert.equal(wallHungInfo(Detail.WallBanner + DYE_COUNT), null);
  assert.equal(wallHungInfo(Detail.BracketSign + SIGN_MOTIF_COUNT), null);
  // Builders refuse what the roster doesn't hold.
  assert.throws(() => wallBannerDetail(DYE_COUNT));
  assert.throws(() => wallBannerDetail(-1));
  assert.throws(() => bracketSignDetail(SIGN_MOTIF_COUNT));
  assert.throws(() => trellisDetail(TRELLIS_SPECIES_COUNT));
  assert.throws(() => sillHerbsDetail(SILL_MIX_COUNT));
  assert.throws(() => herbBundlesDetail(BUNDLE_MIX_COUNT));
  // Past the mixed rosters the bands stay dark.
  assert.equal(wallHungInfo(Detail.SillHerbs + SILL_MIX_COUNT), null);
  assert.equal(wallHungInfo(Detail.HerbBundles + BUNDLE_MIX_COUNT), null);
});

test('wall-hung bands: the set and the reader agree, and bands never overlap', () => {
  // WALL_HUNG_DETAILS is generated FROM wallHungInfo — pin the shape
  // anyway so a refactor can't quietly split them.
  for (const d of WALL_HUNG_DETAILS) {
    assert.notEqual(wallHungInfo(d), null, `set member ${d} resolves`);
  }
  for (let d = 0; d < 256; d++) {
    if (wallHungInfo(d) !== null) {
      assert.ok(WALL_HUNG_DETAILS.has(d as Detail), `resolving id ${d} is in the set`);
    }
  }
  // No two hanging ids collide (bands are disjoint by construction —
  // pinned so a future band can't land on an occupied range).
  const seen = new Map<number, string>();
  for (const d of WALL_HUNG_DETAILS) {
    const info = wallHungInfo(d)!;
    const key = `${info.kind}:${info.dye ?? info.motif ?? info.species ?? 0}`;
    assert.ok(!seen.has(d), `id ${d} dealt once`);
    seen.set(d, key);
  }
  // Hanging bands live clear of the ground details.
  for (const d of WALL_HUNG_DETAILS) assert.ok(d >= Detail.WallBanner || d <= Detail.Tapestry);
});

test('awning bands: awningInfo/awningTile round-trip, defs stand, walk-under holds', () => {
  assert.equal(AWNING_TILES.size, AWNING_SHAPES.length * DYE_COUNT);
  for (const shape of AWNING_SHAPES) {
    for (let dye = 0; dye < DYE_COUNT; dye++) {
      const t = awningTile(shape, dye);
      assert.ok(AWNING_TILES.has(t));
      const info = awningInfo(t);
      assert.equal(info?.shape, shape);
      assert.equal(info?.dye, dye);
      assert.equal(AWNING_SHAPES[info!.shapeIndex], shape);
      // Every dyed id has a real def: named, walkable (the street
      // runs on beneath the cloth), and raised for the collect scan.
      const def = tileDef(t);
      assert.ok(def.name.includes('awning'), `${t} named`);
      assert.equal(def.solid, false, `${def.name} walk-under`);
      assert.equal(def.raised, true, `${def.name} raised`);
    }
  }
  // The band reader claims nothing outside its bands.
  assert.equal(awningInfo(Tile.Throne), null);
  assert.equal(awningInfo(Tile.AwningShed + DYE_COUNT), null);
  assert.equal(awningInfo(Tile.AwningBowed + DYE_COUNT), null);
  assert.throws(() => awningTile('shed', DYE_COUNT));
  assert.throws(() => awningTile('shed', -1));
  // Awning bands collide with no shipped tile id.
  for (const t of AWNING_TILES) assert.ok(t >= Tile.AwningShed, `${t} above the shipped roster`);
});

test('HANGABLE_WALL_TILES: solid full walls only, dressed by a hangings pass', () => {
  for (const t of HANGABLE_WALL_TILES) {
    assert.ok(tileDef(t).solid, `${tileDef(t).name} is wall mass`);
    // Full walls only: never a doorway, window, corner, or gate.
    assert.ok(!DOOR_TILES.has(t), `${tileDef(t).name} is not a door`);
    assert.ok(!DIAG_WALL_TILES.has(t), `${tileDef(t).name} is not a corner`);
    assert.ok(
      t !== Tile.WallWoodWindow && t !== Tile.WallStoneWindow,
      `${tileDef(t).name} is not glazing`,
    );
  }
  // The two families the painters actually dress.
  assert.ok(HANGABLE_WALL_TILES.has(Tile.WallWood));
  assert.ok(HANGABLE_WALL_TILES.has(Tile.WallStone));
  assert.ok(HANGABLE_WALL_TILES.has(Tile.WallGarrison));
  // THE SILL LAW: the pots live ONLY on glazed walls, and the one
  // host resolver routes every family to its own ground.
  assert.deepEqual([...SILL_HOST_TILES].sort(), [Tile.WallStoneWindow, Tile.WallWoodWindow].sort());
  assert.equal(hangHostTiles(sillHerbsDetail(0)), SILL_HOST_TILES);
  assert.equal(hangHostTiles(herbBundlesDetail(0)), HANGABLE_WALL_TILES);
  assert.equal(hangHostTiles(Detail.WallBanner), HANGABLE_WALL_TILES);
  for (const t of SILL_HOST_TILES) {
    assert.ok(!HANGABLE_WALL_TILES.has(t), `${tileDef(t).name} never hosts a full-face hanging`);
  }
});

test('AWNING_HOST_TILES: framed south faces only — corners and curtains refuse', () => {
  // Every classic shopfront host bolts an awning: full walls, glazed
  // walls, straight doorways in every posture and width.
  for (const t of [
    Tile.WallWood,
    Tile.WallStone,
    Tile.WallWoodWindow,
    Tile.WallStoneWindow,
    Tile.DoorwayWood,
    Tile.DoorwayStoneWide,
    Tile.DoorwayWoodShut,
  ]) {
    assert.ok(AWNING_HOST_TILES.has(t), `${tileDef(t).name} hosts an awning`);
  }
  // No 45° corner presents the full south face the brackets need,
  // and the garrison curtain keeps its martial bareness.
  for (const t of DIAG_WALL_TILES) {
    assert.ok(!AWNING_HOST_TILES.has(t), `${tileDef(t).name} refuses`);
  }
  for (const t of GARRISON_TILES) {
    assert.ok(!AWNING_HOST_TILES.has(t), `${tileDef(t).name} refuses`);
  }
});

test('banner pole band: dyed poles round-trip, defs stand, hash pole untouched', () => {
  for (let dye = 0; dye < DYE_COUNT; dye++) {
    const t = bannerPoleTile(dye);
    assert.deepEqual(bannerPoleInfo(t), { dye });
    const def = tileDef(t);
    assert.equal(def.name, 'banner pole');
    assert.equal(def.solid, true);
    assert.equal(def.raised, true);
  }
  assert.equal(bannerPoleInfo(Tile.BannerPole), null, 'the authored pole keeps its hash deal');
  assert.equal(bannerPoleInfo(Tile.BannerPoleDyed + DYE_COUNT), null);
  assert.throws(() => bannerPoleTile(DYE_COUNT));
});
