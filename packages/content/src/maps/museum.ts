import {
  AWNING_SHAPES,
  Detail,
  TILE_DEFS,
  Tile,
  awningTile,
  bannerPoleTile,
  bannerStandTile,
  bracketSignDetail,
  drapeFallDetail,
  greatBannerDetail,
  herbBundlesDetail,
  pennantDetail,
  sillHerbsDetail,
  trellisDetail,
  wallArmsDetail,
  wallBannerDetail,
} from '@arx/shared';
import { ARMS_FORMS, BUNDLE_MIXES, DYES, SIGN_MOTIFS, SILL_MIXES, TRELLIS_SPECIES } from '../buildables.js';
import { MUSEUM_PLANE_ID } from '../planes.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * THE PROP MUSEUM — the developer's review hall (dev builds only; the
 * plane stands only when DEV_COMMANDS is on, and `/museum` is the one
 * door in). EVERY prop, station, wall, ground material, and hung cloth
 * the game can paint is laid out in labeled bays a body can walk,
 * read, and interact with — the audit floor for the art pass.
 *
 * Laws of the floor:
 * - One bay per exhibit: the piece stands north, its plinth signpost
 *   stands two tiles south, and the aisle south of that stays clear —
 *   the plaque reads on approach and the walk lane never clips art.
 * - Context is part of the exhibit: doors stand in their own wall
 *   family, awnings bolt to real shopfronts, hangings ride the hosts
 *   THE HANGING LAW allows, sill pots get their window walls, and the
 *   cliff/stair pair is shown as a true raised terrace.
 * - Banded families (dyes, motifs, forms) show EVERY variant in one
 *   contiguous row under one plaque — the colorway comparison is the
 *   point of the row.
 * - THE STRAYS GALLERY closes the hall: any TILE_DEFS id no authored
 *   wing claimed is exhibited there automatically, so a prop added
 *   next month walks into the museum on its own. Coverage is total by
 *   construction; museum.test.ts pins it.
 */

// ------------------------------------------------------------ manifest

type Exhibit =
  | { kind: 'single'; tile: Tile }
  | { kind: 'swatch'; tile: Tile } // 3x3 ground material patch
  | { kind: 'pool'; tile: Tile } // water tile in a grass apron
  | { kind: 'run'; tile: Tile; flank?: Tile } // 3-tile E-W wall run, center = tile
  | { kind: 'hung'; detail: Detail; host: Tile; label: string }
  | { kind: 'floordetail'; detail: Detail; host: Tile; label: string }
  | { kind: 'dyerow'; tiles: Tile[]; label: string; lines: string[] }
  | { kind: 'shopfront'; awnings: Tile[]; label: string; lines: string[] }
  | { kind: 'terrace' };

interface Wing {
  label: string;
  exhibits: Exhibit[];
  /** Bay pitch; wide-canopy and ground-patch wings breathe more. */
  pitchX?: number;
  pitchY?: number;
}

const single = (tile: Tile): Exhibit => ({ kind: 'single', tile });
const run = (tile: Tile, flank?: Tile): Exhibit => ({ kind: 'run', tile, flank });

/** Dye roster line for a banded-row plaque ("w-e: red, sun, …"). */
function dyeLine(names: string[]): string[] {
  const rows: string[] = [];
  let line = 'w-e: ';
  for (const n of names) {
    const piece = (line.endsWith(': ') ? '' : ', ') + n.toLowerCase();
    if (line.length + piece.length > 34) {
      rows.push(line);
      line = n.toLowerCase();
    } else line += piece;
  }
  rows.push(line);
  return rows.slice(0, 3);
}

function buildWings(): Wing[] {
  const dyeNames = DYES.map((d) => d.name);
  return [
    {
      label: 'Furniture & Props',
      exhibits: [
        Tile.Table, Tile.Chair, Tile.Throne, Tile.Bench, Tile.Bed, Tile.Bookshelf, Tile.Cabinet,
        Tile.Counter, Tile.Hearth, Tile.Barrel, Tile.Crate, Tile.CrateGoods,
        Tile.MarketStall, Tile.HangingSign, Tile.Signpost, Tile.FlowerBox,
        Tile.ToolRack, Tile.WeaponRack, Tile.Vault, Tile.Lectern, Tile.Basin,
        Tile.LampPost, Tile.Brazier, Tile.TimberPost,
        Tile.ArmorStand, Tile.ArmorStandFull,
      ].map(single),
    },
    {
      label: 'Stations',
      exhibits: [
        Tile.Campfire, Tile.Furnace, Tile.Anvil, Tile.Workbench, Tile.Alembic,
        Tile.TanningRack, Tile.Loom, Tile.CarvingBench, Tile.EnchantingTable,
        Tile.Sawhorse, Tile.BeastPen, Tile.CompostBin, Tile.Well, Tile.IrrigationChannel,
        Tile.MushroomLog, Tile.GrowingFrame, Tile.FeedTrough,
        Tile.Windmill, Tile.ButterChurn, Tile.FruitPress, Tile.BrewKeg,
        Tile.Smoker, Tile.DryingRack, Tile.Apiary,
        Tile.Scarecrow, Tile.HayBale, Tile.Silo, Tile.Dovecote,
        Tile.BankChest, Tile.ShopCounter,
      ].map(single),
    },
    {
      label: 'Town life',
      exhibits: [
        Tile.TownFountain, Tile.FounderStatue, Tile.NoticeBoard, Tile.TownBell,
        Tile.ProduceStand, Tile.HandCart, Tile.BarrelStack, Tile.CrateStack,
        Tile.GrainSacks, Tile.Woodpile, Tile.ChoppingBlock, Tile.HitchingPost,
        Tile.StreetPlanter, Tile.StoneBench,
      ].map(single),
    },
    {
      label: 'Trades & shops',
      exhibits: [
        Tile.QuenchTrough, Tile.Grindstone, Tile.SmithBellows, Tile.IngotRack,
        Tile.LumberRack, Tile.FelledLog, Tile.LogPile, Tile.LogPileEndOn,
        Tile.DyeVats, Tile.TailorsDummy, Tile.ClothBolts,
        Tile.BreadOven, Tile.ButcherBlock, Tile.HerbRack, Tile.ShopShelf,
        Tile.WallFountain, Tile.WaterCask, Tile.WaterTrough,
        Tile.PottersWheel, Tile.PotteryKiln, Tile.ScribesDesk,
        Tile.CandleRack, Tile.FletchersBench, Tile.CobblersBench,
        Tile.FishmongerSlab, Tile.TiedParcels, Tile.DisplayTable,
      ].map(single),
    },
    {
      label: 'Commons',
      exhibits: [
        Tile.CandleStand, Tile.CandleStandOut,
        Tile.CandleCluster, Tile.CandleClusterOut,
        Tile.MeltedCandles, Tile.MeltedCandlesOut,
        Tile.CandleTable, Tile.CandleTableOut,
        Tile.PillarCandle, Tile.PillarCandleOut,
        Tile.TripleCandles, Tile.TripleCandlesOut,
        Tile.StreetLantern, Tile.WayShrine,
        Tile.GuardianStatue, Tile.TapCask,
        Tile.WoodStool, Tile.SettleBench, Tile.BasketStack, Tile.GlazedJars,
        Tile.BroomAndPail, Tile.CloakStand, Tile.LeanLadder, Tile.Wheelbarrow,
        Tile.WayfarersRest, Tile.MooringPost, Tile.BeachedSkiff,
      ].map(single),
    },
    {
      label: 'Elven',
      exhibits: [
        Tile.ArcaneBeacon, Tile.RunePillar, Tile.Runestone, Tile.CrystalCluster,
        Tile.WardArch, Tile.ArcaneTome,
        Tile.Everflame, Tile.Moonwell, Tile.ElvenWaystone,
        Tile.ElvenBanner, Tile.ElvenChimes,
        Tile.ElvenBench, Tile.ElvenTable, Tile.ElvenChair, Tile.ElvenDaybed,
        Tile.ElvenBookcase, Tile.ElvenLectern, Tile.ElvenMirror,
        Tile.ElvenHarp, Tile.ElvenLoom, Tile.MithrilAnvil, Tile.ElvenArmsRack,
        Tile.ElvenFountain, Tile.ElvenStatue, Tile.ElvenPlanter,
      ].map(single),
    },
    {
      label: 'War camp',
      exhibits: [
        run(Tile.Palisade), single(Tile.PalisadeDiagNE), single(Tile.PalisadeDiagNW),
        run(Tile.PalisadeGate, Tile.Palisade), run(Tile.PalisadeGateShut, Tile.Palisade),
        ...[
          Tile.StandingTorch, Tile.Bonfire, Tile.WarBrazier,
          Tile.TentHide, Tile.TentWar,
          Tile.SkullPile, Tile.SkullTotem, Tile.WarBanner,
          Tile.PrisonCage, Tile.SpikeBarrier,
          Tile.MeatSpit, Tile.MeatRack, Tile.CookPot, Tile.PotionRack,
          Tile.BeastNest, Tile.PlunderSacks, Tile.SpearRack,
          Tile.TargetDummy, Tile.WarDrum, Tile.HideFrame,
          Tile.BoneMidden, Tile.TrophyStake, Tile.GrogTub, Tile.KnucklePit,
          Tile.RagNest, Tile.BeastStake, Tile.CritterCage,
          Tile.AlarmGong, Tile.WarTable,
          Tile.PlunderCart, Tile.BossEffigy, Tile.GnawTrough,
        ].map(single),
      ],
    },
    {
      label: 'Shore camp',
      exhibits: [
        Tile.WhaleRibs, Tile.TideTotem, Tile.TideAltar,
        Tile.Dugout, Tile.LurePole,
        Tile.FishRack, Tile.NetFrame, Tile.HarpoonRack,
        Tile.FishTrap, Tile.CatchBasket, Tile.ShellMidden, Tile.RoeNest,
        Tile.ReedShelter, Tile.SmokeTripod, Tile.WeirPanels, Tile.KeepPool,
        Tile.MendingBench, Tile.ShellBench, Tile.SaltPan,
        Tile.KelpLine, Tile.WithyStore, Tile.TideChimes,
      ].map(single),
    },
    {
      label: 'Dungeon',
      exhibits: [
        Tile.GrandPillar, Tile.BrokenPillar, Tile.Sarcophagus, Tile.AncientStatue,
        Tile.WallSconce, Tile.WallChains, Tile.ChainedSkeleton,
        Tile.BurialUrns, Tile.MossBarrel, Tile.MineCart,
        Tile.GibbetCage, Tile.Stocks, Tile.TimberBrace, Tile.WallFossil,
        Tile.WallWeb, Tile.DripPool, Tile.ColdCamp, Tile.LootedChest,
        Tile.CandleShrine, Tile.IronGrate,
      ].map(single),
    },
    {
      label: 'Graveyard',
      exhibits: [
        run(Tile.IronFence), single(Tile.IronFenceDiagNE), single(Tile.IronFenceDiagNW),
        run(Tile.IronGate, Tile.IronFence), run(Tile.IronGateShut, Tile.IronFence),
        ...[
          Tile.Gravestone, Tile.GravestoneTall, Tile.GraveMound,
          Tile.MournerStatue,
        ].map(single),
      ],
    },
    {
      label: 'Garden',
      exhibits: [
        run(Tile.Hedge), single(Tile.HedgeDiagNE), single(Tile.HedgeDiagNW),
        run(Tile.HedgeGate, Tile.Hedge), run(Tile.HedgeGateShut, Tile.Hedge),
        single(Tile.HerbPlanter),
      ],
    },
    {
      label: 'Chests',
      exhibits: [
        Tile.ChestWood, Tile.ChestWoodOpen, Tile.ChestMossy, Tile.ChestMossyOpen,
        Tile.ChestIron, Tile.ChestIronOpen, Tile.ChestGilded, Tile.ChestGildedOpen,
        Tile.ChestBoss, Tile.ChestBossOpen,
      ].map(single),
    },
    {
      label: 'Walls & Doors',
      exhibits: [
        run(Tile.WallStone), run(Tile.WallStoneWindow, Tile.WallStone),
        run(Tile.DoorwayStone, Tile.WallStone), run(Tile.DoorwayStoneWide, Tile.WallStone),
        run(Tile.DoorwayStoneShut, Tile.WallStone), run(Tile.DoorwayStoneWideShut, Tile.WallStone),
        single(Tile.WallStoneDiagNE), single(Tile.WallStoneDiagNW),
        single(Tile.WallStoneDiagSE), single(Tile.WallStoneDiagSW),
        run(Tile.WallWood), run(Tile.WallWoodWindow, Tile.WallWood),
        run(Tile.DoorwayWood, Tile.WallWood), run(Tile.DoorwayWoodWide, Tile.WallWood),
        run(Tile.DoorwayWoodShut, Tile.WallWood), run(Tile.DoorwayWoodWideShut, Tile.WallWood),
        single(Tile.WallWoodDiagNE), single(Tile.WallWoodDiagNW),
        single(Tile.WallWoodDiagSE), single(Tile.WallWoodDiagSW),
        run(Tile.ArchStone, Tile.WallStone), run(Tile.PillarStone),
        run(Tile.RailWood), run(Tile.Fence),
        run(Tile.CaveWall), run(Tile.CrackedCaveWall, Tile.CaveWall),
      ],
    },
    {
      label: 'Fortifications',
      exhibits: [
        run(Tile.WallGarrison),
        run(Tile.GateGarrison, Tile.WallGarrison), run(Tile.GateGarrisonShut, Tile.WallGarrison),
        single(Tile.WallGarrisonDiagNE), single(Tile.WallGarrisonDiagNW),
        single(Tile.WallGarrisonDiagSE), single(Tile.WallGarrisonDiagSW),
      ],
    },
    {
      label: 'Awnings',
      // One true shopfront per shape: a stone wall run with the full
      // dye row bolted beneath it — colorways read side by side.
      exhibits: AWNING_SHAPES.map((shape) => ({
        kind: 'shopfront' as const,
        awnings: DYES.map((_, dye) => awningTile(shape, dye)),
        label: `${shape} awning x${DYES.length} dyes`,
        lines: dyeLine(dyeNames),
      })),
      pitchY: 7,
    },
    {
      label: 'Standing banners',
      exhibits: [
        {
          kind: 'dyerow' as const,
          tiles: DYES.map((_, i) => bannerStandTile(i)),
          label: 'banner stand x10 dyes',
          lines: dyeLine(dyeNames),
        },
        {
          kind: 'dyerow' as const,
          tiles: DYES.map((_, i) => bannerPoleTile(i)),
          label: 'banner pole x10 dyes',
          lines: dyeLine(dyeNames),
        },
      ],
      pitchY: 7,
    },
    {
      label: 'Wall hangings',
      exhibits: [
        { kind: 'hung' as const, detail: Detail.BannerCrown, host: Tile.WallStone, label: 'crown banner' },
        { kind: 'hung' as const, detail: Detail.BannerMoon, host: Tile.WallStone, label: 'moon banner' },
        { kind: 'hung' as const, detail: Detail.Tapestry, host: Tile.WallStone, label: 'tapestry' },
        { kind: 'hung' as const, detail: Detail.WallBasket, host: Tile.WallWood, label: 'wall basket' },
        ...DYES.map((dye, i) => ({
          kind: 'hung' as const, detail: wallBannerDetail(i), host: Tile.WallStone,
          label: `${dye.name.toLowerCase()} banner`,
        })),
        ...DYES.map((dye, i) => ({
          kind: 'hung' as const, detail: pennantDetail(i), host: Tile.WallWood,
          label: `${dye.name.toLowerCase()} pennants`,
        })),
        ...SIGN_MOTIFS.map((m, i) => ({
          kind: 'hung' as const, detail: bracketSignDetail(i), host: Tile.WallWood,
          label: `${m.name.toLowerCase()} sign`,
        })),
        ...TRELLIS_SPECIES.map((sp, i) => ({
          kind: 'hung' as const, detail: trellisDetail(i), host: Tile.WallStone,
          label: `${sp.name.toLowerCase()} trellis`,
        })),
        ...SILL_MIXES.map((m, i) => ({
          kind: 'hung' as const, detail: sillHerbsDetail(i), host: Tile.WallStoneWindow,
          label: `${m.name.toLowerCase()} sill pots`,
        })),
        ...BUNDLE_MIXES.map((m, i) => ({
          kind: 'hung' as const, detail: herbBundlesDetail(i), host: Tile.WallWood,
          label: `${m.name.toLowerCase()} bundles`,
        })),
        ...ARMS_FORMS.map((f, i) => ({
          kind: 'hung' as const, detail: wallArmsDetail(i), host: Tile.WallStone,
          label: `${f.name.toLowerCase()} mount`,
        })),
        ...DYES.map((dye, i) => ({
          kind: 'hung' as const, detail: greatBannerDetail(i), host: Tile.WallStone,
          label: `${dye.name.toLowerCase()} great banner`,
        })),
        ...DYES.map((dye, i) => ({
          kind: 'hung' as const, detail: drapeFallDetail(i), host: Tile.WallStone,
          label: `${dye.name.toLowerCase()} drape`,
        })),
      ],
    },
    {
      label: 'Floor decor',
      exhibits: [
        { kind: 'floordetail' as const, detail: Detail.Rug, host: Tile.WoodFloor, label: 'rug' },
        { kind: 'floordetail' as const, detail: Detail.RugRound, host: Tile.WoodFloor, label: 'round rug' },
        { kind: 'floordetail' as const, detail: Detail.CarpetRoyal, host: Tile.StoneFloor, label: 'royal carpet' },
        { kind: 'floordetail' as const, detail: Detail.CarpetMoon, host: Tile.StoneFloor, label: 'moonpale carpet' },
        { kind: 'floordetail' as const, detail: Detail.Doormat, host: Tile.WoodFloor, label: 'doormat' },
        { kind: 'floordetail' as const, detail: Detail.Sawdust, host: Tile.WoodFloor, label: 'sawdust' },
        { kind: 'floordetail' as const, detail: Detail.Straw, host: Tile.Dirt, label: 'straw' },
        { kind: 'floordetail' as const, detail: Detail.Flowers, host: Tile.Grass, label: 'flowers' },
        { kind: 'floordetail' as const, detail: Detail.Tuft, host: Tile.Grass, label: 'grass tuft' },
        { kind: 'floordetail' as const, detail: Detail.Pebbles, host: Tile.Dirt, label: 'pebbles' },
        { kind: 'floordetail' as const, detail: Detail.Mushroom, host: Tile.Grass, label: 'mushroom' },
      ],
    },
    {
      label: 'Trees & Flora',
      exhibits: [
        Tile.Tree, Tile.TreeOak, Tile.TreeWillow, Tile.TreeYew, Tile.TreePine,
        Tile.Sapling, Tile.SaplingOak, Tile.SaplingWillow, Tile.SaplingYew, Tile.SaplingPine,
        Tile.Stump, Tile.BerryBush, Tile.FibrePlant, Tile.WildSagewort,
        Tile.WildMoonbell, Tile.GlowShroom, Tile.Stalagmite, Tile.BonePile,
      ].map(single),
      pitchX: 8,
      pitchY: 7,
    },
    {
      label: 'Rocks & Ores',
      exhibits: [
        Tile.Rock, Tile.RockDepleted, Tile.RockCopper, Tile.RockTin, Tile.RockIron,
        Tile.RockCoal, Tile.RockGold, Tile.RockSilver, Tile.RockMithril,
        Tile.RockAdamant, Tile.RockObsidian, Tile.RockStarfall,
      ].map(single),
      pitchX: 6,
    },
    {
      label: 'Crops',
      exhibits: [
        Tile.CropSprout, Tile.CarrotMid, Tile.CarrotRipe, Tile.SagewortMid,
        Tile.SagewortRipe, Tile.SunflowerMid, Tile.SunflowerRipe, Tile.WheatMid,
        Tile.WheatRipe, Tile.CottonMid, Tile.CottonRipe, Tile.MoonbellMid,
        Tile.MoonbellRipe,
      ].map(single),
    },
    {
      label: 'Ground materials',
      exhibits: ([
        Tile.Grass, Tile.GrassTall, Tile.Dirt, Tile.Path, Tile.Sand, Tile.Snow,
        Tile.Swamp, Tile.Tilled, Tile.StoneFloor, Tile.WoodFloor, Tile.CaveFloor,
        Tile.CaveRubble, Tile.DungeonFloor, Tile.Bridge, Tile.Dock, Tile.PorchDeck,
      ] as Tile[]).map((tile) => ({ kind: 'swatch' as const, tile })),
      pitchX: 6,
      pitchY: 7,
    },
    {
      label: 'Water',
      exhibits: ([
        Tile.WaterShallow, Tile.Water, Tile.WaterDeep, Tile.FishingSpot,
        Tile.PikeHole, Tile.EelRun, Tile.SalmonRun, Tile.GlimmerShoal,
      ] as Tile[]).map((tile) => ({ kind: 'pool' as const, tile })),
      pitchX: 7,
      pitchY: 8,
    },
    {
      label: 'Elevation',
      exhibits: [{ kind: 'terrace' as const }],
      pitchY: 12,
    },
    {
      label: 'Portals',
      exhibits: [Tile.PortalDown, Tile.PortalUp].map(single),
    },
  ];
}

/**
 * Tiles no bay exhibits on purpose. Everything else in TILE_DEFS is
 * either claimed by an authored wing or falls to THE STRAYS GALLERY.
 */
export const MUSEUM_EXCLUDED: ReadonlySet<Tile> = new Set([
  Tile.Void, // the un-tile
  Tile.Cliff, // structural — shown by the Elevation terrace's fence
  Tile.Ramp, // structural — shown by the Elevation terrace's stair
]);

// ------------------------------------------------------------- layout

const W = 128;
const MARGIN = 4;
const DEFAULT_PITCH_X = 5;
const DEFAULT_PITCH_Y = 6;

interface Op {
  (b: ZoneBuilder): void;
}

/** Every tile id the built museum exhibits (for the coverage test). */
export function museumExhibitedTiles(): Set<number> {
  const placed = new Set<number>();
  for (const wing of buildWings()) {
    for (const ex of wing.exhibits) {
      if (ex.kind === 'single' || ex.kind === 'swatch' || ex.kind === 'pool') placed.add(ex.tile);
      else if (ex.kind === 'run') placed.add(ex.tile);
      else if (ex.kind === 'dyerow') for (const t of ex.tiles) placed.add(t);
      else if (ex.kind === 'shopfront') for (const t of ex.awnings) placed.add(t);
      else if (ex.kind === 'hung' || ex.kind === 'floordetail') placed.add(ex.host);
    }
  }
  return placed;
}

/** TILE_DEFS ids neither exhibited nor excluded — the strays gallery. */
export function museumStrayTiles(): Tile[] {
  const placed = museumExhibitedTiles();
  const strays: Tile[] = [];
  for (const key of Object.keys(TILE_DEFS)) {
    const t = Number(key) as Tile;
    if (!placed.has(t) && !MUSEUM_EXCLUDED.has(t)) strays.push(t);
  }
  return strays;
}

export function buildMuseum(): ZoneDef {
  const wings = buildWings();
  const strays = museumStrayTiles();
  if (strays.length > 0) {
    wings.push({ label: 'Strays (unfiled art)', exhibits: strays.map(single) });
  }

  // Pass 1 — lay the floor plan as deferred ops, measuring height.
  const ops: Op[] = [];
  const placedTiles = new Set<number>();
  let cy = 3;

  // The entrance: the welcome plinth; the spawn stands just north.
  const doorX = Math.floor(W / 2);
  const entranceY = cy;
  const spawnAt = { x: doorX, y: cy };
  ops.push((b) =>
    b.sign(doorX, entranceY + 2, 'THE PROP MUSEUM', [
      'every prop, wall, and cloth',
      'plinths carry name + tile id',
      '/museum leaves the hall',
    ]),
  );
  cy += 6;

  const name = (t: Tile): string => TILE_DEFS[t]?.name ?? `tile ${t}`;

  for (const wing of wings) {
    const pitchX = wing.pitchX ?? DEFAULT_PITCH_X;
    const pitchY = wing.pitchY ?? DEFAULT_PITCH_Y;

    // Skip exhibits whose star tile already stands in an earlier wing
    // (the crypt kit shows in both the graveyard and the dungeon
    // shelf; the museum shows a piece ONCE, first wing wins).
    const exhibits = wing.exhibits.filter((ex) => {
      if (ex.kind === 'single' || ex.kind === 'swatch' || ex.kind === 'pool' || ex.kind === 'run') {
        if (placedTiles.has(ex.tile)) return false;
        placedTiles.add(ex.tile);
      }
      return true;
    });
    if (exhibits.length === 0) continue;

    // Wing header plinth on the west margin.
    const headerY = cy;
    ops.push((b) => b.sign(MARGIN + 1, headerY + 1, wing.label.toUpperCase(), ['wing']));
    cy += 3;

    let bx = MARGIN;
    for (const ex of exhibits) {
      // Wide exhibits claim their own full row.
      const wide =
        ex.kind === 'shopfront' ? ex.awnings.length + 2
        : ex.kind === 'dyerow' ? ex.tiles.length * 2 + 2
        : ex.kind === 'terrace' ? 14
        : pitchX;
      if (bx + wide > W - MARGIN) {
        bx = MARGIN;
        cy += pitchY;
      }
      const x0 = bx;
      const y0 = cy;
      switch (ex.kind) {
        case 'single': {
          ops.push((b) => {
            // The plinth stands at the piece's SOUTH-EAST corner (the
            // gallery convention): straight south, the camera's 0.6
            // tilt lets any prop over ~1.5 tiles tall bury its own
            // post — the market stall taught this on opening day.
            b.set(x0 + 2, y0 + 1, ex.tile);
            b.sign(x0 + 3, y0 + 3, name(ex.tile), [`tile ${ex.tile}`]);
          });
          break;
        }
        case 'swatch': {
          ops.push((b) => {
            b.fillRect(x0 + 1, y0, 3, 3, ex.tile);
            b.sign(x0 + 2, y0 + 4, name(ex.tile), [`tile ${ex.tile}`]);
          });
          break;
        }
        case 'pool': {
          ops.push((b) => {
            b.fillRect(x0, y0, 5, 4, Tile.Grass);
            b.fillRect(x0 + 1, y0 + 1, 3, 2, ex.tile);
            b.sign(x0 + 2, y0 + 4, name(ex.tile), [`tile ${ex.tile}`]);
          });
          break;
        }
        case 'run': {
          const flank = ex.flank ?? ex.tile;
          ops.push((b) => {
            b.set(x0 + 1, y0 + 1, flank);
            b.set(x0 + 2, y0 + 1, ex.tile);
            b.set(x0 + 3, y0 + 1, flank);
            b.sign(x0 + 2, y0 + 3, name(ex.tile), [`tile ${ex.tile}`]);
          });
          break;
        }
        case 'hung': {
          ops.push((b) => {
            b.set(x0 + 1, y0 + 1, ex.host);
            b.set(x0 + 2, y0 + 1, ex.host);
            b.set(x0 + 3, y0 + 1, ex.host);
            b.setDetail(x0 + 2, y0 + 1, ex.detail);
            b.sign(x0 + 2, y0 + 3, ex.label, [`detail ${ex.detail}`]);
          });
          break;
        }
        case 'floordetail': {
          ops.push((b) => {
            b.fillRect(x0 + 1, y0, 3, 3, ex.host);
            b.setDetail(x0 + 2, y0 + 1, ex.detail);
            b.sign(x0 + 2, y0 + 4, ex.label, [`detail ${ex.detail}`]);
          });
          break;
        }
        case 'dyerow': {
          ops.push((b) => {
            for (let i = 0; i < ex.tiles.length; i++) b.set(x0 + 1 + i * 2, y0 + 1, ex.tiles[i]!);
            b.sign(x0 + ex.tiles.length, y0 + 3, ex.label, ex.lines);
          });
          break;
        }
        case 'shopfront': {
          ops.push((b) => {
            for (let i = 0; i < ex.awnings.length; i++) {
              b.set(x0 + 1 + i, y0 + 1, Tile.WallStone);
              b.set(x0 + 1 + i, y0 + 2, ex.awnings[i]!);
            }
            b.sign(x0 + 1 + Math.floor(ex.awnings.length / 2), y0 + 4, ex.label, ex.lines);
          });
          break;
        }
        case 'terrace': {
          ops.push((b) => {
            b.raise(x0 + 2, y0 + 1, 8, 4, 1);
            b.stairs(x0 + 5, y0 + 4);
            b.sign(x0 + 5, y0 + 7, 'cliff & stair', ['raised terrace, level 1']);
          });
          break;
        }
      }
      bx += wide;
    }
    cy += pitchY + 1; // wing gap
  }

  const H = cy + MARGIN;

  // Pass 2 — materialize.
  const b = new ZoneBuilder('museum', 'The Prop Museum', { x: 0, y: 0 }, W, H, Tile.StoneFloor);
  b.onPlane(MUSEUM_PLANE_ID);
  b.spawn(spawnAt.x, spawnAt.y);
  for (const op of ops) op(b);

  return b.build();
}
