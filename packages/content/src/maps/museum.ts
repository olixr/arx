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
import type { SpectrumAxis, SpectrumStroke } from '../spectrum.js';
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
  | { kind: 'terrace' }
  /** THE LIVING GROUND: one material, one strip per look, band by band. */
  | { kind: 'foldrow'; tile: Tile };

interface Wing {
  label: string;
  exhibits: Exhibit[];
  /** Bay pitch; wide-canopy and ground-patch wings breathe more. */
  pitchX?: number;
  pitchY?: number;
  /** Lines under the header plinth (absent = the bare 'wing' note). */
  intro?: string[];
  /**
   * Bare floor rows before the header and after the last row: a wing
   * whose FIELD spills past its exhibits (the Living Ground's hem is
   * FOLD_PAD tiles deep on every side of its crest) lands that hem on
   * empty flags, never under a neighbour wing's plinths.
   */
  padY?: number;
}

// ------------------------------------------------ THE LIVING GROUND wing
/**
 * THE LIVING GROUND (docs/contested-lands-plan.md §12.8 LG-2): every
 * material that folds, one tile row per look, the FIELD ramping west
 * to east across the row so the four bands stand in a line — summer |
 * touched | taken | held — each band a FOLD_CELL-wide cell, the strip
 * in a grass apron so the material's hem, fringe and bank read against
 * the meadow's own fold beside them, and a plaque with a reading spot
 * under every strip.
 *
 * THE MECHANISM, chosen and named: the museum's ground is a zone, and
 * the fold is not a tile — it is a field the bake reads from the
 * stroke registry. So the wing DECLARES its own stroke set
 * (museumSpectrum()): one rect stroke per look in the museum plane's
 * own coordinates, soft 1 (the whole hem is the ramp), grain 0 (a
 * clean ruler, so "which band" per cell is exact and museum.test.ts
 * pins it), the plateau standing just east of each strip and its
 * FOLD_PAD-tile hem lying across the strip. The painter reads the
 * declaration KEYED ON THE PLANE (client render/fold.ts
 * setSpectrumPlane, latched once per frame beside the fold gate):
 * while the player stands in this plane the field is this set and
 * nothing else; the wire's strokes and cores (surface coordinates
 * that would fold this hall wherever the numbers overlap) stay held
 * and return the moment the plane changes. Nothing rides the wire
 * and the server knows nothing: a login that wakes inside the hall,
 * a `/museum` crossing either way, and a broadcast registry swap
 * while a reviewer stands in the wing all show the same ruler.
 * Two roads were refused: a `?fold` query (neither data the zone
 * owns nor scoped to the plane — it would fold whatever ground the
 * viewer stood on) and a per-session server swap on `/museum` (built
 * first; it missed the login-inside case, since the welcome applies
 * the world's geo, and every broadcast push clobbered it).
 * Blocks stand FOLD_BLOCK_PITCH apart because a rect's hem is
 * symmetric: east of each crest the hall's own flags run the ramp
 * back over the gap, and the next block begins past that hem; the
 * wing pads FOLD_PAD bare rows north and south for the same reason.
 */
export const FOLD_CELL = 3;
export const FOLD_STRIP_W = FOLD_CELL * 4;
export const FOLD_STRIP_H = 3;
/** The ramp: the stroke's hem in tiles (the rect's pad). */
export const FOLD_PAD = 12;
/** The grass apron around a strip: one tile each side. */
export const FOLD_BLOCK_W = FOLD_STRIP_W + 2;
export const FOLD_BLOCK_H = FOLD_STRIP_H + 2;
/** Blocks stand past each other's east hem (pad + the plateau's own width). */
export const FOLD_BLOCK_PITCH = FOLD_BLOCK_W + FOLD_PAD + 1;

export interface MuseumFoldLook {
  id: string;
  name: string;
  axis: SpectrumAxis;
  amp: number;
}

/** The looks, west to east: the turn (to the cold), the flush, blight, burn. */
export const MUSEUM_FOLD_LOOKS: readonly MuseumFoldLook[] = [
  { id: 'museum-turn', name: 'the turn', axis: 'season', amp: 1 },
  { id: 'museum-flush', name: 'the flush', axis: 'season', amp: -1 },
  { id: 'museum-blight', name: 'blight', axis: 'blight', amp: 1 },
  { id: 'museum-burn', name: 'burn', axis: 'burn', amp: 1 },
];

/** Every material that carries a MaterialFold (terrain.ts's BlobLayer.fold), north to south. */
export const MUSEUM_FOLD_MATERIALS: readonly Tile[] = [
  Tile.Dirt,
  Tile.Path,
  Tile.Tilled,
  Tile.Swamp,
  Tile.Sand,
  Tile.StoneFloor,
  Tile.DungeonFloor,
  Tile.CaveRubble,
  Tile.Snow,
  Tile.WaterShallow,
];

/**
 * THE PLAQUE TELLS THE TRUTH: the (material, look) pairs that HOLD —
 * the material answers that look with no key at all (snow is a winter
 * no-op on every season sign; the flush reaches only the marsh, the
 * one material that is half plant; the shallows answer the flush with
 * nothing, not even a bank face). Their plaques say so instead of
 * promising a ramp. The client's foldSkins.ts is the truth and
 * terrain.fold.test.ts pins this table against it, pair for pair.
 */
export const MUSEUM_FOLD_HOLDS: ReadonlyArray<readonly [Tile, string]> = [
  [Tile.Snow, 'museum-turn'],
  [Tile.Snow, 'museum-flush'],
  [Tile.Snow, 'museum-blight'],
  [Tile.Dirt, 'museum-flush'],
  [Tile.Path, 'museum-flush'],
  [Tile.Tilled, 'museum-flush'],
  [Tile.Sand, 'museum-flush'],
  [Tile.StoneFloor, 'museum-flush'],
  [Tile.DungeonFloor, 'museum-flush'],
  [Tile.CaveRubble, 'museum-flush'],
  [Tile.WaterShallow, 'museum-flush'],
];

/** Whether a wing strip's material holds (folds nothing) under a look. */
export function museumFoldHolds(tile: Tile, lookId: string): boolean {
  return MUSEUM_FOLD_HOLDS.some(([t, l]) => t === tile && l === lookId);
}

/**
 * THE PLAQUE TELLS THE WHOLE TRUTH: pairs that answer a look but not
 * with the ramp — the strand and the laid floors under the turn rime
 * only at held (frost lobes, the runs' cold inks); the shallows under
 * the turn and under burn answer only at the bank face (the water
 * fill never folds). Their plaques say so instead of promising
 * "summer, touched, taken, held". terrain.fold.test.ts pins both
 * tables against foldSkins, pair for pair.
 */
export const MUSEUM_FOLD_HELD_ONLY: ReadonlyArray<readonly [Tile, string]> = [
  [Tile.Sand, 'museum-turn'],
  [Tile.StoneFloor, 'museum-turn'],
  [Tile.DungeonFloor, 'museum-turn'],
  [Tile.CaveRubble, 'museum-turn'],
];
export const MUSEUM_FOLD_BANK_ONLY: ReadonlyArray<readonly [Tile, string]> = [
  [Tile.WaterShallow, 'museum-turn'],
  [Tile.WaterShallow, 'museum-burn'],
];

/** The plaque's first line: the ramp legend, the held-only or bank-only legend, or the hold. */
export const FOLD_PLAQUE_RAMP = 'w-e: summer, touched, taken, held';
export const FOLD_PLAQUE_HELD_ONLY = 'answers at held only';
export const FOLD_PLAQUE_BANK_ONLY = 'answers at the bank face only';
export const FOLD_PLAQUE_HOLD = 'holds under this look';

/** The legend a (material, look) plaque prints. */
export function museumFoldLegend(tile: Tile, lookId: string): string {
  if (museumFoldHolds(tile, lookId)) return FOLD_PLAQUE_HOLD;
  if (MUSEUM_FOLD_HELD_ONLY.some(([t, l]) => t === tile && l === lookId)) return FOLD_PLAQUE_HELD_ONLY;
  if (MUSEUM_FOLD_BANK_ONLY.some(([t, l]) => t === tile && l === lookId)) return FOLD_PLAQUE_BANK_ONLY;
  return FOLD_PLAQUE_RAMP;
}

/** Where the wing stands once the hall is laid out — the strokes and the test read it. */
export interface MuseumFoldWing {
  /** The apron rows' span (y0 inclusive, y1 exclusive). */
  y0: number;
  y1: number;
  /** Per look: the block's west edge, its strip's west edge, the crest (the rect's x). */
  blocks: Array<{ look: MuseumFoldLook; x0: number; stripX: number; crestX: number }>;
  /** Per material: the apron's top row and the strip's top row. */
  rows: Array<{ tile: Tile; y0: number; stripY: number }>;
}

const foldrow = (tile: Tile): Exhibit => ({ kind: 'foldrow', tile });

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
        Tile.HandCart, Tile.BarrelStack, Tile.CrateStack,
        Tile.GrainSacks, Tile.Woodpile, Tile.HitchingPost,
        Tile.StreetPlanter, Tile.StoneBench,
      ].map(single),
    },
    {
      label: 'Trades & shops',
      exhibits: [
        Tile.QuenchTrough, Tile.Grindstone, Tile.IngotRack,
        Tile.LumberRack, Tile.FelledLog, Tile.LogPile, Tile.LogPileEndOn,
        Tile.DyeVats, Tile.TailorsDummy, Tile.ClothBolts,
        Tile.ButcherBlock, Tile.HerbRack, Tile.ShopShelf,
        Tile.WallFountain, Tile.WaterTrough,
        Tile.ScribesDesk,
        Tile.CandleRack, Tile.FletchersBench,
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
        Tile.WoodStool, Tile.BasketStack, Tile.GlazedJars,
        Tile.BroomAndPail, Tile.LeanLadder, Tile.Wheelbarrow,
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
      // THE SCARRED LAND (docs/contested-lands-plan.md §6): every id
      // 505..545 in family order, the run families shown as runs (the
      // broken fence and the dead hedge inside their living lines),
      // then the six floor Details. The strays gallery stays quiet.
      label: 'The Scarred Land',
      exhibits: [
        run(Tile.RuinWallStone), run(Tile.RuinWallWood),
        ...[
          Tile.CharredBeam, Tile.CollapsedRoof, Tile.AshHeap, Tile.EmberBed, Tile.ChimneyStack,
          Tile.BrokenCart, Tile.FieldLitter, Tile.ArrowPost, Tile.FallenBanner,
          Tile.FieldCairn, Tile.CairnFallen, Tile.BeastBones,
          Tile.CharredStump, Tile.DeadTree, Tile.SpoilHeap,
          Tile.GloomStone, Tile.CreepRoot, Tile.FoulPool, Tile.CropBlighted,
          Tile.CharterPost, Tile.LampCairn, Tile.LegionStandard, Tile.BoneTree,
          Tile.TallyStone, Tile.WardThread, Tile.RedRagStake, Tile.PitLamp, Tile.PitLampDark,
          Tile.LeanTo, Tile.Bedroll, Tile.BelongingsCart, Tile.FieldCot,
        ].map(single),
        run(Tile.FenceBroken, Tile.Fence),
        single(Tile.SignpostBurnt), single(Tile.WellFouled),
        run(Tile.HedgeDead, Tile.Hedge),
        single(Tile.LampPostDark), single(Tile.SluiceGate), single(Tile.SluiceGateStrung),
        { kind: 'floordetail' as const, detail: Detail.Ash, host: Tile.Dirt, label: 'ash' },
        { kind: 'floordetail' as const, detail: Detail.Bones, host: Tile.Dirt, label: 'bones' },
        { kind: 'floordetail' as const, detail: Detail.DragFurrow, host: Tile.Dirt, label: 'drag furrow' },
        { kind: 'floordetail' as const, detail: Detail.BlightVeins, host: Tile.Grass, label: 'blight veins' },
        { kind: 'floordetail' as const, detail: Detail.DarkSpill, host: Tile.StoneFloor, label: 'dark spill' },
        { kind: 'floordetail' as const, detail: Detail.Mudcrack, host: Tile.Dirt, label: 'mudcrack' },
      ],
      pitchY: 7,
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
        { kind: 'floordetail' as const, detail: Detail.LeafLitter, host: Tile.Grass, label: 'leaf litter' },
        { kind: 'floordetail' as const, detail: Detail.Bracken, host: Tile.Grass, label: 'bracken' },
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
      label: 'The Living Ground',
      exhibits: MUSEUM_FOLD_MATERIALS.map(foldrow),
      pitchY: FOLD_BLOCK_H + 3,
      padY: FOLD_PAD,
      intro: [
        'the field ramps west to east:',
        'summer, touched, taken, held',
        'east of each crest the hall',
        'flags run the ramp back',
      ],
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
      else if (ex.kind === 'run' || ex.kind === 'foldrow') placed.add(ex.tile);
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

interface MuseumLayout {
  ops: Op[];
  spawnAt: { x: number; y: number };
  H: number;
  foldWing: MuseumFoldWing;
}

let LAYOUT: MuseumLayout | null = null;

/** Pass 1 — lay the floor plan as deferred ops, measuring height. Memoised: the plan is pure. */
function layoutMuseum(): MuseumLayout {
  if (LAYOUT !== null) return LAYOUT;
  const wings = buildWings();
  const strays = museumStrayTiles();
  if (strays.length > 0) {
    wings.push({ label: 'Strays (unfiled art)', exhibits: strays.map(single) });
  }

  const ops: Op[] = [];
  const placedTiles = new Set<number>();
  const foldWing: MuseumFoldWing = { y0: 0, y1: 0, blocks: [], rows: [] };
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

    // Bare rows before a wing whose field spills past its exhibits.
    cy += wing.padY ?? 0;
    // Wing header plinth on the west margin.
    const headerY = cy;
    ops.push((b) => b.sign(MARGIN + 1, headerY + 1, wing.label.toUpperCase(), wing.intro ?? ['wing']));
    cy += 3;
    if (wing.exhibits.some((ex) => ex.kind === 'foldrow')) {
      foldWing.y0 = cy;
      for (let k = 0; k < MUSEUM_FOLD_LOOKS.length; k++) {
        const x0 = MARGIN + k * FOLD_BLOCK_PITCH;
        foldWing.blocks.push({ look: MUSEUM_FOLD_LOOKS[k]!, x0, stripX: x0 + 1, crestX: x0 + 1 + FOLD_STRIP_W });
      }
    }

    let bx = MARGIN;
    for (const ex of exhibits) {
      // Wide exhibits claim their own full row.
      const wide =
        ex.kind === 'shopfront' ? ex.awnings.length + 2
        : ex.kind === 'dyerow' ? ex.tiles.length * 2 + 2
        : ex.kind === 'terrace' ? 14
        : ex.kind === 'foldrow' ? W - MARGIN * 2
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
        case 'foldrow': {
          // One strip per look, each in its grass apron, the plaque
          // under the strip's middle and its reading spot south of it.
          foldWing.rows.push({ tile: ex.tile, y0, stripY: y0 + 1 });
          foldWing.y1 = y0 + FOLD_BLOCK_H;
          const label = `${name(ex.tile).toLowerCase()}`;
          for (const block of foldWing.blocks) {
            const bx0 = block.x0;
            const lookName = block.look.name;
            const legend = museumFoldLegend(ex.tile, block.look.id);
            ops.push((b) => {
              b.fillRect(bx0, y0, FOLD_BLOCK_W, FOLD_BLOCK_H, Tile.Grass);
              b.fillRect(bx0 + 1, y0 + 1, FOLD_STRIP_W, FOLD_STRIP_H, ex.tile);
              b.sign(bx0 + Math.floor(FOLD_BLOCK_W / 2), y0 + FOLD_BLOCK_H, `${label} · ${lookName}`, [
                legend,
                `tile ${ex.tile}`,
              ]);
            });
          }
          break;
        }
      }
      bx += wide;
    }
    cy += pitchY + 1 + (wing.padY ?? 0); // wing gap (+ the field's own hem)
  }

  LAYOUT = { ops, spawnAt, H: cy + MARGIN, foldWing };
  return LAYOUT;
}

/** Where THE LIVING GROUND wing stands (museum-plane coordinates). */
export function museumFoldWing(): MuseumFoldWing {
  return layoutMuseum().foldWing;
}

/**
 * THE LIVING GROUND wing's stroke set — the museum plane's own, never
 * the world's (see the wing's header comment for the mechanism). One
 * 'max' rect per look: the plateau two tiles wide just east of the
 * strips, the hem FOLD_PAD tiles west across them, soft 1 and grain 0
 * so every cell's band is a ruler read; the rect spans the wing's rows
 * with a margin so no strip sees a corner of the hem.
 */
export function museumSpectrum(): SpectrumStroke[] {
  const wing = layoutMuseum().foldWing;
  return wing.blocks.map((block) => ({
    id: block.look.id,
    axis: block.look.axis,
    shape: { kind: 'rect', x: block.crestX, y: wing.y0 - 1, w: 2, h: wing.y1 - wing.y0 + 2, pad: FOLD_PAD },
    amp: block.look.amp,
    soft: 1,
    grain: 0,
    mode: 'max',
  }));
}

export function buildMuseum(): ZoneDef {
  const { ops, spawnAt, H } = layoutMuseum();

  // Pass 2 — materialize.
  const b = new ZoneBuilder('museum', 'The Prop Museum', { x: 0, y: 0 }, W, H, Tile.StoneFloor);
  b.onPlane(MUSEUM_PLANE_ID);
  b.spawn(spawnAt.x, spawnAt.y);
  for (const op of ops) op(b);

  return b.build();
}
