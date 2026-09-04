/**
 * THE WORLD'S LEDGER — TileDef and the 784-entry TILE_DEFS table
 * (foundations polish; moved verbatim from tiles.ts, which re-exports).
 */
import { DYE_COUNT, Tile } from './tilesEnum.js';

export interface TileDef {
  name: string;
  solid: boolean;
  /** Base fill color; variants add per-tile hash variation. */
  color: string;
  variants?: string[];
  /** Drawn as a raised block with a top highlight + hard shadow. */
  raised?: boolean;
  topColor?: string;
}

export const TILE_DEFS: Record<Tile, TileDef> = {
  [Tile.Void]: { name: 'void', solid: true, color: '#141020' },
  [Tile.Grass]: {
    name: 'grass',
    solid: false,
    color: '#5d8a3e',
    variants: ['#578339', '#649247'],
  },
  [Tile.GrassTall]: { name: 'tall grass', solid: false, color: '#4f7c35', variants: ['#4a7632'] },
  [Tile.Dirt]: { name: 'dirt', solid: false, color: '#96744c', variants: ['#8f6e47'] },
  [Tile.Path]: { name: 'path', solid: false, color: '#c2a26e', variants: ['#bb9c68'] },
  [Tile.Sand]: { name: 'sand', solid: false, color: '#ddc98d', variants: ['#d6c286'] },
  [Tile.Water]: { name: 'water', solid: true, color: '#4979b8', variants: ['#4472ae'] },
  [Tile.WaterShallow]: { name: 'shallow water', solid: false, color: '#649cc0', variants: ['#5f96ba'] },
  [Tile.WaterDeep]: { name: 'deep water', solid: true, color: '#3a629e', variants: ['#355c94'] },
  [Tile.StoneFloor]: {
    name: 'stone floor',
    solid: false,
    color: '#a09aa8',
    variants: ['#98929f', '#a8a2b0'],
  },
  [Tile.WoodFloor]: { name: 'wood floor', solid: false, color: '#a87e46', variants: ['#a07641'] },
  [Tile.WallStone]: {
    name: 'stone wall',
    solid: true,
    color: '#4a4554',
    raised: true,
    topColor: '#767181',
  },
  [Tile.WallWood]: {
    name: 'wood wall',
    solid: true,
    color: '#54391c',
    raised: true,
    topColor: '#7d5a2e',
  },
  [Tile.Tree]: { name: 'tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#2d6631' },
  [Tile.Rock]: { name: 'rock', solid: true, color: '#6e6a75', raised: true, topColor: '#827e8a' },
  [Tile.Stump]: { name: 'stump', solid: false, color: '#8a6a45' },
  [Tile.Fence]: { name: 'fence', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.Bridge]: { name: 'bridge', solid: false, color: '#96703c', variants: ['#8e6836'] },
  [Tile.Dock]: { name: 'dock', solid: false, color: '#9c7a4a', variants: ['#92714a'] },
  [Tile.Snow]: { name: 'snow', solid: false, color: '#e8ecf2', variants: ['#dfe4ec'] },
  [Tile.Swamp]: { name: 'swamp', solid: false, color: '#4d6b3c', variants: ['#476339'] },
  [Tile.TreeOak]: { name: 'oak tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#1f5426' },
  [Tile.TreeWillow]: { name: 'willow tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#5a8a4a' },
  [Tile.TreeYew]: { name: 'yew tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#1e4028' },
  [Tile.TreePine]: { name: 'pine tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#2b5747' },
  [Tile.RockCopper]: { name: 'copper rock', solid: true, color: '#6e6a75', raised: true, topColor: '#b87333' },
  [Tile.RockIron]: { name: 'iron rock', solid: true, color: '#6e6a75', raised: true, topColor: '#8d9299' },
  [Tile.RockDepleted]: { name: 'depleted rock', solid: true, color: '#57535f', raised: true, topColor: '#615d69' },
  [Tile.FishingSpot]: { name: 'fishing spot', solid: true, color: '#3d6fb8', variants: ['#3a69ae'] },
  [Tile.Campfire]: { name: 'campfire', solid: true, color: '#8a6a45', raised: true, topColor: '#e8823d' },
  [Tile.Furnace]: { name: 'furnace', solid: true, color: '#55505e', raised: true, topColor: '#e8573d' },
  [Tile.Anvil]: { name: 'anvil', solid: true, color: '#55505e', raised: true, topColor: '#3a363f' },
  [Tile.Workbench]: { name: 'workbench', solid: true, color: '#7d5a2e', raised: true, topColor: '#a5793f' },
  [Tile.BankChest]: { name: 'bank chest', solid: true, color: '#7d5a2e', raised: true, topColor: '#e8a33d' },
  [Tile.ShopCounter]: { name: 'shop counter', solid: true, color: '#7d5a2e', raised: true, topColor: '#96703c' },
  [Tile.CaveWall]: { name: 'cave wall', solid: true, color: '#2e2937', raised: true, topColor: '#3d3749' },
  [Tile.CaveFloor]: { name: 'cave floor', solid: false, color: '#4d4757', variants: ['#48424f', '#524c5e'] },
  [Tile.PortalDown]: { name: 'cave entrance', solid: false, color: '#1a1626', variants: ['#221c30'] },
  [Tile.PortalUp]: { name: 'way out', solid: false, color: '#5b4f7a', variants: ['#65588a'] },
  [Tile.Cliff]: { name: 'cliff', solid: true, color: '#5b5566', raised: true, topColor: '#8c8798' },
  [Tile.Ramp]: { name: 'stone stair', solid: false, color: '#8a8494', variants: ['#847e8e'] },
  [Tile.RockTin]: { name: 'tin rock', solid: true, color: '#6e6a75', raised: true, topColor: '#c9c4cf' },
  [Tile.RockCoal]: { name: 'coal rock', solid: true, color: '#6e6a75', raised: true, topColor: '#2e2b33' },
  [Tile.RockGold]: { name: 'gold rock', solid: true, color: '#6e6a75', raised: true, topColor: '#e8b64c' },
  [Tile.LampPost]: { name: 'lamp post', solid: true, color: '#3a3444', raised: true, topColor: '#e8c06a' },
  [Tile.Tilled]: { name: 'garden plot', solid: false, color: '#6b4f33', variants: ['#654a30', '#715436'] },
  [Tile.CropSprout]: { name: 'sprout', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CarrotMid]: { name: 'carrots', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CarrotRipe]: { name: 'ripe carrots', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SagewortMid]: { name: 'sagewort', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SagewortRipe]: { name: 'ripe sagewort', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SunflowerMid]: { name: 'sunflowers', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SunflowerRipe]: { name: 'ripe sunflowers', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.WheatMid]: { name: 'wheat', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.WheatRipe]: { name: 'ripe wheat', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CottonMid]: { name: 'cotton', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CottonRipe]: { name: 'ripe cotton', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.MoonbellMid]: { name: 'moonbell', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.MoonbellRipe]: { name: 'ripe moonbell', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.Alembic]: { name: 'alembic bench', solid: true, color: '#7d5a2e', raised: true, topColor: '#7fc9b3' },
  [Tile.BerryBush]: { name: 'berry bush', solid: true, color: '#3a6d38', raised: true, topColor: '#2f5c32' },
  [Tile.FibrePlant]: { name: 'fibre plant', solid: true, color: '#5f8a44', raised: true, topColor: '#79a355' },
  [Tile.WildSagewort]: { name: 'wild sagewort', solid: true, color: '#5b8a5e', raised: true, topColor: '#8fb083' },
  [Tile.WildMoonbell]: { name: 'wild moonbell', solid: true, color: '#4c5578', raised: true, topColor: '#8f9ed6' },
  [Tile.WallStoneWindow]: {
    name: 'stone wall window',
    solid: true,
    color: '#4a4554',
    raised: true,
    topColor: '#767181',
  },
  [Tile.WallWoodWindow]: {
    name: 'wood wall window',
    solid: true,
    color: '#54391c',
    raised: true,
    topColor: '#7d5a2e',
  },
  [Tile.DoorwayStone]: { name: 'stone doorway', solid: false, color: '#4a4554' },
  [Tile.DoorwayWood]: { name: 'wood doorway', solid: false, color: '#54391c' },
  [Tile.DoorwayStoneWide]: { name: 'wide stone doorway', solid: false, color: '#4a4554' },
  [Tile.DoorwayWoodWide]: { name: 'wide wood doorway', solid: false, color: '#54391c' },
  [Tile.DoorwayStoneShut]: { name: 'shut stone doorway', solid: true, color: '#4a4554' },
  [Tile.DoorwayWoodShut]: { name: 'shut wood doorway', solid: true, color: '#54391c' },
  [Tile.DoorwayStoneWideShut]: { name: 'shut wide stone doorway', solid: true, color: '#4a4554' },
  [Tile.DoorwayWoodWideShut]: { name: 'shut wide wood doorway', solid: true, color: '#54391c' },
  [Tile.WallStoneDiagNE]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallStoneDiagNW]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallStoneDiagSE]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallStoneDiagSW]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallWoodDiagNE]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.WallWoodDiagNW]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.WallWoodDiagSE]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.WallWoodDiagSW]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.ArchStone]: { name: 'stone arch', solid: false, color: '#5b5566' },
  [Tile.PillarStone]: { name: 'stone pillar', solid: true, color: '#5b5566', raised: true, topColor: '#8c8798' },
  [Tile.RailWood]: { name: 'wood railing', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.Barrel]: { name: 'barrel', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.Crate]: { name: 'crate', solid: true, color: '#8a6534', raised: true, topColor: '#a5793f' },
  [Tile.CrateGoods]: { name: 'goods crate', solid: true, color: '#8a6534', raised: true, topColor: '#d98e3c' },
  [Tile.Table]: { name: 'table', solid: true, color: '#7a552e', raised: true, topColor: '#a5793f' },
  [Tile.Chair]: { name: 'chair', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.Bench]: { name: 'bench', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.Bed]: { name: 'bed', solid: true, color: '#7a552e', raised: true, topColor: '#a34b52' },
  [Tile.Bookshelf]: { name: 'bookshelf', solid: true, color: '#5e3f1e', raised: true, topColor: '#7a552e' },
  [Tile.Cabinet]: { name: 'cabinet', solid: true, color: '#6f4d26', raised: true, topColor: '#8a6534' },
  [Tile.Counter]: { name: 'counter', solid: true, color: '#6f4d26', raised: true, topColor: '#94693a' },
  [Tile.Hearth]: { name: 'hearth', solid: true, color: '#55505e', raised: true, topColor: '#e8823d' },
  [Tile.MarketStall]: { name: 'market stall', solid: true, color: '#7a552e', raised: true, topColor: '#b5493e' },
  [Tile.BannerPole]: { name: 'banner pole', solid: true, color: '#3a3444', raised: true, topColor: '#7a3f8f' },
  [Tile.HangingSign]: { name: 'hanging sign', solid: true, color: '#5e3f1e', raised: true, topColor: '#a5793f' },
  [Tile.FlowerBox]: { name: 'flower box', solid: true, color: '#6f4d26', raised: true, topColor: '#d977a8' },
  [Tile.ToolRack]: { name: 'tool rack', solid: true, color: '#5e3f1e', raised: true, topColor: '#8a8a95' },
  [Tile.WeaponRack]: { name: 'weapon rack', solid: true, color: '#5e3f1e', raised: true, topColor: '#b6bcc6' },
  [Tile.Vault]: { name: 'vault', solid: true, color: '#3f3a4a', raised: true, topColor: '#e8a33d' },
  [Tile.Lectern]: { name: 'lectern', solid: true, color: '#6f4d26', raised: true, topColor: '#e8dfc8' },
  [Tile.Basin]: { name: 'basin', solid: true, color: '#5b5566', raised: true, topColor: '#4979b8' },
  [Tile.TanningRack]: { name: 'tanning rack', solid: true, color: '#6f4d26', raised: true, topColor: '#b08a5c' },
  [Tile.Loom]: { name: 'loom', solid: true, color: '#6f4d26', raised: true, topColor: '#d8cbb0' },
  [Tile.CarvingBench]: { name: 'carving bench', solid: true, color: '#7d5a2e', raised: true, topColor: '#9b7440' },
  [Tile.Sawhorse]: { name: 'sawhorse', solid: true, color: '#7d5a2e', raised: true, topColor: '#a8794a' },
  [Tile.BeastPen]: { name: 'beast pen', solid: true, color: '#6e5433', raised: true, topColor: '#96703f' },
  [Tile.CompostBin]: { name: 'compost bin', solid: true, color: '#6e5433', raised: true, topColor: '#4a3a28' },
  [Tile.Well]: { name: 'well', solid: true, color: '#6e6a75', raised: true, topColor: '#827e8a' },
  [Tile.IrrigationChannel]: { name: 'irrigation channel', solid: false, color: '#7a5c3c', variants: ['#735739'] },
  [Tile.PotatoMid]: { name: 'potato plants', solid: false, color: '#654a30' },
  [Tile.PotatoRipe]: { name: 'ripe potatoes', solid: false, color: '#654a30' },
  [Tile.OnionMid]: { name: 'onion shoots', solid: false, color: '#654a30' },
  [Tile.OnionRipe]: { name: 'ripe onions', solid: false, color: '#654a30' },
  [Tile.CabbageMid]: { name: 'young cabbage', solid: false, color: '#654a30' },
  [Tile.CabbageRipe]: { name: 'ripe cabbage', solid: false, color: '#654a30' },
  [Tile.PumpkinMid]: { name: 'pumpkin vine', solid: false, color: '#654a30' },
  [Tile.PumpkinRipe]: { name: 'ripe pumpkin', solid: false, color: '#654a30' },
  [Tile.BarleyMid]: { name: 'green barley', solid: false, color: '#654a30' },
  [Tile.BarleyRipe]: { name: 'ripe barley', solid: false, color: '#654a30' },
  [Tile.RedrootMid]: { name: 'redroot plants', solid: false, color: '#654a30' },
  [Tile.RedrootRipe]: { name: 'ripe redroot', solid: false, color: '#654a30' },
  [Tile.KingsquashMid]: { name: 'kingsquash vine', solid: false, color: '#654a30' },
  [Tile.KingsquashRipe]: { name: 'ripe kingsquash', solid: false, color: '#654a30' },
  [Tile.BittercressMid]: { name: 'young bittercress', solid: false, color: '#654a30' },
  [Tile.BittercressRipe]: { name: 'ripe bittercress', solid: false, color: '#654a30' },
  [Tile.SilverleafMid]: { name: 'young silverleaf', solid: false, color: '#654a30' },
  [Tile.SilverleafRipe]: { name: 'ripe silverleaf', solid: false, color: '#654a30' },
  [Tile.DuskthornMid]: { name: 'young duskthorn', solid: false, color: '#654a30' },
  [Tile.DuskthornRipe]: { name: 'ripe duskthorn', solid: false, color: '#654a30' },
  [Tile.DawnveilMid]: { name: 'young dawnveil', solid: false, color: '#654a30' },
  [Tile.DawnveilRipe]: { name: 'ripe dawnveil', solid: false, color: '#654a30' },
  [Tile.AdderstongueMid]: { name: 'young adderstongue', solid: false, color: '#654a30' },
  [Tile.AdderstongueRipe]: { name: 'ripe adderstongue', solid: false, color: '#654a30' },
  [Tile.AppleTreeMid]: { name: 'young apple tree', solid: true, color: '#654a30', raised: true, topColor: '#4f7c35' },
  [Tile.AppleTreeRipe]: { name: 'apple tree', solid: true, color: '#654a30', raised: true, topColor: '#4f7c35' },
  [Tile.BrambleMid]: { name: 'bramble canes', solid: false, color: '#654a30' },
  [Tile.BrambleRipe]: { name: 'ripe bramblevine', solid: false, color: '#654a30' },
  [Tile.PlumTreeMid]: { name: 'young plum tree', solid: true, color: '#654a30', raised: true, topColor: '#4f7c35' },
  [Tile.PlumTreeRipe]: { name: 'plum tree', solid: true, color: '#654a30', raised: true, topColor: '#446a3a' },
  [Tile.MirefigMid]: { name: 'young mirefig', solid: true, color: '#654a30', raised: true, topColor: '#5a6b3a' },
  [Tile.MirefigRipe]: { name: 'mirefig tree', solid: true, color: '#654a30', raised: true, topColor: '#5a6b3a' },
  [Tile.MushroomLog]: { name: 'mushroom log', solid: true, color: '#5f4426', raised: true, topColor: '#7d5a2e' },
  [Tile.MushroomLogSeeded]: { name: 'spored log', solid: true, color: '#5f4426', raised: true, topColor: '#8d867c' },
  [Tile.PalegillMid]: { name: 'budding palegill', solid: true, color: '#5f4426', raised: true, topColor: '#c9c2b4' },
  [Tile.PalegillRipe]: { name: 'ripe palegill', solid: true, color: '#5f4426', raised: true, topColor: '#d8d2c4' },
  [Tile.GrowingFrame]: { name: 'growing frame', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.FeedTrough]: { name: 'feed trough', solid: true, color: '#6e5433', raised: true, topColor: '#96703f' },
  [Tile.Windmill]: { name: 'windmill', solid: true, color: '#8d8798', raised: true, topColor: '#a8794a' },
  [Tile.ButterChurn]: { name: 'butter churn', solid: true, color: '#7d5a2e', raised: true, topColor: '#a8794a' },
  [Tile.FruitPress]: { name: 'fruit press', solid: true, color: '#6e5433', raised: true, topColor: '#96703f' },
  [Tile.BrewKeg]: { name: 'brew keg', solid: true, color: '#94693a', raised: true, topColor: '#7d5a2e' },
  [Tile.Smoker]: { name: 'smoker', solid: true, color: '#55505e', raised: true, topColor: '#6e6a75' },
  [Tile.DryingRack]: { name: 'drying rack', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6234' },
  [Tile.Apiary]: { name: 'apiary', solid: true, color: '#c9a86a', raised: true, topColor: '#e0c48e' },
  [Tile.Scarecrow]: { name: 'scarecrow', solid: true, color: '#8a6a45', raised: true, topColor: '#c9a86a' },
  [Tile.HayBale]: { name: 'hay bale', solid: true, color: '#c9a64b', raised: true, topColor: '#e0c48e' },
  [Tile.Silo]: { name: 'silo', solid: true, color: '#8d8798', raised: true, topColor: '#a8794a' },
  [Tile.Dovecote]: { name: 'dovecote', solid: true, color: '#e8e2d4', raised: true, topColor: '#7d5a2e' },
  // THE CAMP BARES ITS TEETH — war-camp fortification + props.
  [Tile.Palisade]: { name: 'spiked palisade', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeDiagNE]: { name: 'spiked palisade', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeDiagNW]: { name: 'spiked palisade', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeGate]: { name: 'palisade gate', solid: false, color: '#6b4a26', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeGateShut]: { name: 'palisade gate', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.StandingTorch]: { name: 'standing torch', solid: true, color: '#6b4a26', raised: true, topColor: '#e8823d' },
  [Tile.Bonfire]: { name: 'bonfire', solid: true, color: '#57535f', raised: true, topColor: '#e8823d' },
  [Tile.WarBrazier]: { name: 'war brazier', solid: true, color: '#3a3444', raised: true, topColor: '#e8823d' },
  [Tile.TentHide]: { name: 'hide tent', solid: true, color: '#7a5c3e', raised: true, topColor: '#8f6e4a' },
  [Tile.TentWar]: { name: 'war tent', solid: true, color: '#6e4a33', raised: true, topColor: '#84583c' },
  [Tile.SkullPile]: { name: 'skull pile', solid: true, color: '#c9c2ae', raised: true, topColor: '#ddd6c2' },
  [Tile.SkullTotem]: { name: 'skull totem', solid: true, color: '#6b4a26', raised: true, topColor: '#c9c2ae' },
  [Tile.WarBanner]: { name: 'war banner', solid: true, color: '#6b4a26', raised: true, topColor: '#8a3b34' },
  [Tile.PrisonCage]: { name: 'prison cage', solid: true, color: '#5e4023', raised: true, topColor: '#7d5a2e' },
  [Tile.SpikeBarrier]: { name: 'spike barrier', solid: true, color: '#6b4a26', raised: true, topColor: '#8a6534' },
  [Tile.MeatSpit]: { name: 'roasting spit', solid: true, color: '#6b4a26', raised: true, topColor: '#a3543a' },
  [Tile.MeatRack]: { name: 'meat rack', solid: true, color: '#6b4a26', raised: true, topColor: '#8a4a3a' },
  [Tile.CookPot]: { name: 'cook pot', solid: true, color: '#3a3444', raised: true, topColor: '#5d7a42' },
  [Tile.PotionRack]: { name: 'potion rack', solid: true, color: '#6b4a26', raised: true, topColor: '#5d8a6e' },
  [Tile.BeastNest]: { name: 'beast nest', solid: true, color: '#8a6a45', raised: true, topColor: '#a5834f' },
  [Tile.PlunderSacks]: { name: 'plunder sacks', solid: true, color: '#9c8a62', raised: true, topColor: '#b09c70' },
  [Tile.SpearRack]: { name: 'spear rack', solid: true, color: '#6b4a26', raised: true, topColor: '#8a6534' },
  [Tile.TargetDummy]: { name: 'target dummy', solid: true, color: '#b09c70', raised: true, topColor: '#c9b684' },
  [Tile.WarDrum]: { name: 'war drum', solid: true, color: '#6b4a26', raised: true, topColor: '#c9b088' },
  [Tile.HideFrame]: { name: 'hide frame', solid: true, color: '#6b4a26', raised: true, topColor: '#b08d62' },
  // THE FAIR HOUSE FURNISHED — elven decor. Minimap voice: pale
  // silverbark and cool mithril blues, so an elven quarter reads
  // silver-green where the war camp reads mud-brown.
  [Tile.ArcaneBeacon]: { name: 'arcane beacon', solid: true, color: '#7a6aa8', raised: true, topColor: '#b48fe8' },
  [Tile.ElvenBanner]: { name: 'elven banner', solid: true, color: '#b0a488', raised: true, topColor: '#cfd9ee' },
  [Tile.ElvenBench]: { name: 'elven bench', solid: true, color: '#b0a488', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenTable]: { name: 'elven table', solid: true, color: '#b0a488', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenChair]: { name: 'elven chair', solid: true, color: '#b0a488', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenDaybed]: { name: 'elven daybed', solid: true, color: '#b0a488', raised: true, topColor: '#cfd9ee' },
  [Tile.ElvenBookcase]: { name: 'elven bookcase', solid: true, color: '#a89a80', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenLectern]: { name: 'elven lectern', solid: true, color: '#b0a488', raised: true, topColor: '#e8e2d4' },
  [Tile.ElvenHarp]: { name: 'elven harp', solid: true, color: '#c9bfa4', raised: true, topColor: '#d6e4f2' },
  [Tile.ElvenLoom]: { name: 'elven loom', solid: true, color: '#b0a488', raised: true, topColor: '#cfd9ee' },
  [Tile.ElvenFountain]: { name: 'singing fountain', solid: true, color: '#8d8798', raised: true, topColor: '#7ec4d8' },
  [Tile.ElvenStatue]: { name: 'elven statue', solid: true, color: '#ddd6c2', raised: true, topColor: '#e8e2d4' },
  [Tile.Moonwell]: { name: 'moonwell', solid: true, color: '#8d8798', raised: true, topColor: '#9fe8d8' },
  [Tile.Everflame]: { name: 'everflame', solid: true, color: '#9aaec4', raised: true, topColor: '#dff2ff' },
  [Tile.MithrilAnvil]: { name: 'mithril anvil', solid: true, color: '#7a8598', raised: true, topColor: '#aebfd4' },
  [Tile.ElvenArmsRack]: { name: 'arms rack', solid: true, color: '#b0a488', raised: true, topColor: '#9aaec4' },
  [Tile.ElvenPlanter]: { name: 'elven planter', solid: true, color: '#a89a80', raised: true, topColor: '#5d8a6e' },
  [Tile.ElvenMirror]: { name: 'standing mirror', solid: true, color: '#b0a488', raised: true, topColor: '#d6e4f2' },
  [Tile.ElvenWaystone]: { name: 'waystone', solid: true, color: '#8d8798', raised: true, topColor: '#9fe8d8' },
  [Tile.ElvenChimes]: { name: 'wind chimes', solid: true, color: '#8fa3bd', raised: true, topColor: '#aebfd4' },
  // The imbued works: violet-and-green magic on the minimap.
  [Tile.Runestone]: { name: 'runestone', solid: true, color: '#57535f', raised: true, topColor: '#b48fe8' },
  [Tile.CrystalCluster]: { name: 'mana crystals', solid: true, color: '#3fae6e', raised: true, topColor: '#7fe8a8' },
  [Tile.WardArch]: { name: 'ward arch', solid: true, color: '#8d8798', raised: true, topColor: '#b48fe8' },
  [Tile.ArcaneTome]: { name: 'arcane tome', solid: true, color: '#8d8798', raised: true, topColor: '#efe6ff' },
  [Tile.RunePillar]: { name: 'rune pillar', solid: true, color: '#8d8798', raised: true, topColor: '#7fe8a8' },
  [Tile.PikeHole]: { name: 'pike hole', solid: true, color: '#39679c', variants: ['#366293'] },
  [Tile.EelRun]: { name: 'eel run', solid: true, color: '#31578c', variants: ['#2e5284'] },
  [Tile.SalmonRun]: { name: 'salmon run', solid: true, color: '#457bbd', variants: ['#4174b3'] },
  [Tile.GlimmerShoal]: { name: 'glimmer shoal', solid: true, color: '#4f84c9', variants: ['#4a7dc0'] },
  [Tile.EnchantingTable]: { name: 'enchanting table', solid: true, color: '#4a3f5e', raised: true, topColor: '#7a6aa8' },
  // Saplings: the middle beat of tree regrowth (stump → sapling →
  // tree). Walkable — you step over a knee-high whip — and not a
  // gather node, so they can't be chopped back down mid-growth.
  [Tile.Sapling]: { name: 'sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#57a04b' },
  [Tile.SaplingOak]: { name: 'oak sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#2d6631' },
  [Tile.SaplingWillow]: { name: 'willow sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#5a8a4a' },
  [Tile.SaplingYew]: { name: 'yew sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#1e4028' },
  [Tile.SaplingPine]: { name: 'pine sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#2b5747' },
  [Tile.ChestWood]: { name: 'chest', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.ChestWoodOpen]: { name: 'open chest', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.ChestIron]: { name: 'strongchest', solid: true, color: '#4a4048', raised: true, topColor: '#5e5560' },
  [Tile.ChestIronOpen]: { name: 'open strongchest', solid: true, color: '#4a4048', raised: true, topColor: '#5e5560' },
  [Tile.ChestGilded]: { name: 'gilded coffer', solid: true, color: '#8a6218', raised: true, topColor: '#d9a441' },
  [Tile.ChestGildedOpen]: { name: 'open gilded coffer', solid: true, color: '#8a6218', raised: true, topColor: '#d9a441' },
  [Tile.ChestMossy]: { name: 'mossgrown chest', solid: true, color: '#5a5244', raised: true, topColor: '#5c6b46' },
  [Tile.ChestMossyOpen]: { name: 'open mossgrown chest', solid: true, color: '#5a5244', raised: true, topColor: '#5c6b46' },
  [Tile.ChestBoss]: { name: 'boss chest', solid: true, color: '#2b2635', raised: true, topColor: '#453f52' },
  [Tile.ChestBossOpen]: { name: 'open boss chest', solid: true, color: '#2b2635', raised: true, topColor: '#453f52' },
  [Tile.RockSilver]: { name: 'silver rock', solid: true, color: '#6e6a75', raised: true, topColor: '#dce4f0' },
  [Tile.RockMithril]: { name: 'mithril rock', solid: true, color: '#6e6a75', raised: true, topColor: '#7fa8d9' },
  [Tile.RockAdamant]: { name: 'adamant rock', solid: true, color: '#6e6a75', raised: true, topColor: '#5fa06a' },
  [Tile.RockObsidian]: { name: 'obsidian flow', solid: true, color: '#6e6a75', raised: true, topColor: '#38304a' },
  [Tile.RockStarfall]: { name: 'starfall crater', solid: true, color: '#6e6a75', raised: true, topColor: '#cabdf2' },
  [Tile.Stalagmite]: { name: 'stalagmite', solid: true, color: '#3a3444', raised: true, topColor: '#5a5370' },
  [Tile.BonePile]: { name: 'bone pile', solid: true, color: '#8b8272', raised: true, topColor: '#cfc7ae' },
  [Tile.Brazier]: { name: 'brazier', solid: true, color: '#3c3640', raised: true, topColor: '#e8933c' },
  [Tile.GlowShroom]: { name: 'glowshrooms', solid: true, color: '#3f4a52', raised: true, topColor: '#8fe0cf' },
  [Tile.CaveRubble]: { name: 'rubble', solid: false, color: '#544e5f', variants: ['#4f4959', '#585264'] },
  // Deliberately the CaveWall palette: the crack is a whisper, not a
  // signpost — spotting one is the discovery.
  [Tile.CrackedCaveWall]: { name: 'cracked wall', solid: true, color: '#2e2937', raised: true, topColor: '#3d3749' },
  [Tile.DungeonFloor]: { name: 'flagstones', solid: false, color: '#514b58', variants: ['#4c4653', '#56505e'] },
  // Fence gates: the open gate is a WALKABLE raised prop (the leaf
  // stands swung aside); the shut gate bars the way like any fence.
  [Tile.FenceGate]: { name: 'fence gate', solid: false, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.FenceGateShut]: { name: 'shut fence gate', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.FenceDiagNE]: { name: 'fence', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.FenceDiagNW]: { name: 'fence', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.Signpost]: { name: 'signpost', solid: true, color: '#6b4a24', raised: true, topColor: '#c2a068' },
  // Garrison masonry: a shade deeper and cooler than house stone —
  // rampart granite against the '#4a4554'/'#767181' of building walls.
  [Tile.WallGarrison]: { name: 'garrison wall', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagNE]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagNW]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagSE]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagSW]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  // The open gate is a walkable passage under the gatehouse arch; the
  // shut gate bars it with iron-bound leaves.
  [Tile.GateGarrison]: { name: 'garrison gate', solid: false, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.GateGarrisonShut]: { name: 'shut garrison gate', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.Throne]: { name: 'throne', solid: true, color: '#7a552e', raised: true, topColor: '#c9962e' },
  [Tile.PorchDeck]: { name: 'porch deck', solid: false, color: '#9a7040', variants: ['#93693a'] },
  [Tile.TimberPost]: { name: 'timber post', solid: true, color: '#7a5c34', raised: true, topColor: '#93713f' },
  // THE OUTWARD FACE — awning anchors (dye 0 = linen). Walkable: the
  // canvas is overhead, the street runs on beneath. The other dyes'
  // defs are generated right below the literal from these anchors.
  [Tile.AwningShed]: { name: 'shed awning', solid: false, color: '#c9bfa8', raised: true, topColor: '#d8cfba' },
  [Tile.AwningMarket]: { name: 'market awning', solid: false, color: '#c9bfa8', raised: true, topColor: '#d8cfba' },
  [Tile.AwningBoard]: { name: 'board awning', solid: false, color: '#6e4b29', raised: true, topColor: '#8a6336' },
  [Tile.AwningBowed]: { name: 'bowed awning', solid: false, color: '#c9bfa8', raised: true, topColor: '#d8cfba' },
  [Tile.BannerPoleDyed]: { name: 'banner pole', solid: true, color: '#6f4d26', raised: true, topColor: '#8a6534' },
  // THE CLIPPED GREEN — garden architecture. Minimap voice: clipped
  // leaf-green, a full step deeper than meadow grass, so a garden
  // ring reads as drawn hedgerow, never as a lawn.
  [Tile.Hedge]: { name: 'hedge', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  [Tile.HedgeDiagNE]: { name: 'hedge', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  [Tile.HedgeDiagNW]: { name: 'hedge', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  // The open archway is a WALKABLE raised prop (the path runs under
  // the living arch); the latched wicket bars it like any gate.
  [Tile.HedgeGate]: { name: 'hedge arch', solid: false, color: '#356234', raised: true, topColor: '#4c8342' },
  [Tile.HedgeGateShut]: { name: 'hedge arch', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  // THE LONG DARK FURNISHED — minimap voice: props sit a step warmer
  // or paler than the '#514b58' flagstone dark, so a dressed chamber
  // reads furnished at chart scale without shouting. The two wall
  // fixtures are WALKABLE raised props (the iron rides the wall face;
  // the corridor runs on beneath them).
  [Tile.MossBarrel]: { name: 'mossy barrel', solid: true, color: '#4f5a44', raised: true, topColor: '#5e7048' },
  [Tile.MineCart]: { name: 'ore cart', solid: true, color: '#4c4a52', raised: true, topColor: '#7a6a54' },
  [Tile.ChainedSkeleton]: { name: 'chained skeleton', solid: true, color: '#6f6a5e', raised: true, topColor: '#cfc7ae' },
  [Tile.WallSconce]: { name: 'wall sconce', solid: false, color: '#3c3640', raised: true, topColor: '#e8933c' },
  [Tile.WallChains]: { name: 'wall chains', solid: false, color: '#4a4550', raised: true, topColor: '#6d6875' },
  [Tile.Sarcophagus]: { name: 'sarcophagus', solid: true, color: '#565062', raised: true, topColor: '#847e91' },
  [Tile.BrokenPillar]: { name: 'broken pillar', solid: true, color: '#5b5566', raised: true, topColor: '#8c8798' },
  [Tile.GrandPillar]: { name: 'grand pillar', solid: true, color: '#5b5566', raised: true, topColor: '#938e9f' },
  [Tile.BurialUrns]: { name: 'burial urns', solid: true, color: '#7a5a40', raised: true, topColor: '#a87e50' },
  [Tile.AncientStatue]: { name: 'ancient statue', solid: true, color: '#5e5869', raised: true, topColor: '#8f8a7a' },
  // THE LONG DARK PEOPLED — same chart voice as the first kit: a full
  // value step off the flagstone dark. The wall fixtures and the two
  // floor-flat pieces (pool, grate) are WALKABLE.
  [Tile.GibbetCage]: { name: 'hanging gibbet', solid: true, color: '#565060', raised: true, topColor: '#6d6875' },
  [Tile.Stocks]: { name: 'stocks', solid: true, color: '#6b5844', raised: true, topColor: '#8a7355' },
  [Tile.TimberBrace]: { name: 'mine brace', solid: false, color: '#6b5844', raised: true, topColor: '#8a7355' },
  [Tile.WallFossil]: { name: 'buried ribs', solid: false, color: '#6f6a5e', raised: true, topColor: '#cfc7ae' },
  [Tile.WallWeb]: { name: 'cobwebs', solid: false, color: '#5f5c66', raised: true, topColor: '#9a97a4' },
  [Tile.DripPool]: { name: 'drip pool', solid: false, color: '#3a3d4a', raised: true, topColor: '#566074' },
  [Tile.ColdCamp]: { name: 'cold camp', solid: true, color: '#5a534e', raised: true, topColor: '#7d7268' },
  [Tile.LootedChest]: { name: 'looted chest', solid: true, color: '#66513c', raised: true, topColor: '#84684a' },
  [Tile.CandleShrine]: { name: 'grave candles', solid: true, color: '#6e675a', raised: true, topColor: '#e8c26a' },
  [Tile.IronGrate]: { name: 'iron grate', solid: false, color: '#454049', raised: true, topColor: '#5d5670' },
  // THE BANKS GET THEIR GOODS — minimap voice: silvered driftwood
  // grays and bone pales, each a full value step off the three
  // grounds a shore camp stands on (meadow '#4f7c35', trampled
  // '#96744c', sand '#ddc98d') — cool against the warm bank, so a
  // dressed shore reads as a CAMP at chart scale, never as flotsam.
  [Tile.FishRack]: { name: 'drying rack', solid: true, color: '#75705f', raised: true, topColor: '#b8c4c6' },
  [Tile.TideTotem]: { name: 'tide totem', solid: true, color: '#6e6858', raised: true, topColor: '#cfc7ae' },
  [Tile.NetFrame]: { name: 'hung net', solid: true, color: '#5c6656', raised: true, topColor: '#8d8672' },
  [Tile.Dugout]: { name: 'dugout canoe', solid: true, color: '#6b6353', raised: true, topColor: '#8d8672' },
  [Tile.HarpoonRack]: { name: 'harpoon rack', solid: true, color: '#7a7464', raised: true, topColor: '#cfc7ae' },
  [Tile.ShellMidden]: { name: 'shell midden', solid: true, color: '#a89e8c', raised: true, topColor: '#ded5c4' },
  [Tile.FishTrap]: { name: 'fish trap', solid: true, color: '#7c6c44', raised: true, topColor: '#a08b58' },
  [Tile.RoeNest]: { name: 'roe nest', solid: true, color: '#3f5c48', raised: true, topColor: '#9fe0d0' },
  [Tile.LurePole]: { name: 'lure pole', solid: true, color: '#6b6353', raised: true, topColor: '#7fd8c8' },
  [Tile.TideAltar]: { name: 'tide altar', solid: true, color: '#707a80', raised: true, topColor: '#c98a74' },
  [Tile.CatchBasket]: { name: 'catch baskets', solid: true, color: '#7c6c44', raised: true, topColor: '#b8c4c6' },
  [Tile.WhaleRibs]: { name: 'great ribs', solid: true, color: '#8a8272', raised: true, topColor: '#e6dfc8' },
  // THE CRAFTSMEN OF THE BANKS: the working layer keeps the kit value
  // law — every piece a full step off sand, trampled dirt, and meadow.
  [Tile.ReedShelter]: { name: 'reed shelter', solid: true, color: '#6b7245', raised: true, topColor: '#c2b98a' },
  [Tile.SmokeTripod]: { name: 'smoke tripod', solid: true, color: '#6b6353', raised: true, topColor: '#9aa3a4' },
  [Tile.MendingBench]: { name: 'mending bench', solid: true, color: '#75705f', raised: true, topColor: '#5a7a5c' },
  [Tile.WeirPanels]: { name: 'tidal weir', solid: true, color: '#7c6c44', raised: true, topColor: '#a08b58' },
  [Tile.KelpLine]: { name: 'kelp line', solid: true, color: '#44584a', raised: true, topColor: '#7fae6a' },
  [Tile.SaltPan]: { name: 'salt pan', solid: true, color: '#9aa0a0', raised: true, topColor: '#e8ecec' },
  [Tile.ShellBench]: { name: "shell-carver's bench", solid: true, color: '#8a8272', raised: true, topColor: '#d8cfd8' },
  [Tile.WithyStore]: { name: 'withy bundles', solid: true, color: '#87764a', raised: true, topColor: '#c9b278' },
  [Tile.KeepPool]: { name: 'keep-pool', solid: true, color: '#3c545e', raised: true, topColor: '#b8c4c6' },
  [Tile.TideChimes]: { name: 'shell chimes', solid: true, color: '#6e6858', raised: true, topColor: '#e8d8b8' },
  // THE TOWN KEEPS ITS DAY — minimap voice: warm worked timber and
  // town limestone with one bright key each, every piece a full
  // value step off the three grounds a street stands on (StoneFloor
  // '#514b58', path '#96744c', grass '#4f7c35') — so a dressed
  // square reads as a SQUARE at chart scale, never as clutter.
  [Tile.TownFountain]: { name: 'town fountain', solid: true, color: '#7d8489', raised: true, topColor: '#9fc4d8' },
  [Tile.FounderStatue]: { name: "founder's statue", solid: true, color: '#6f6a58', raised: true, topColor: '#7fae94' },
  [Tile.NoticeBoard]: { name: 'notice board', solid: true, color: '#6f5a38', raised: true, topColor: '#e2d9c4' },
  [Tile.TownBell]: { name: 'town bell', solid: true, color: '#6f5a38', raised: true, topColor: '#c2a45c' },
  [Tile.HandCart]: { name: 'hand cart', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.GrainSacks]: { name: 'grain sacks', solid: true, color: '#8a744e', raised: true, topColor: '#d8c49a' },
  [Tile.BarrelStack]: { name: 'stacked barrels', solid: true, color: '#75603e', raised: true, topColor: '#b08a45' },
  [Tile.CrateStack]: { name: 'stacked crates', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.HitchingPost]: { name: 'hitching post', solid: true, color: '#6f5a38', raised: true, topColor: '#a8823f' },
  [Tile.Woodpile]: { name: 'woodpile', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.StreetPlanter]: { name: 'street planter', solid: true, color: '#75603e', raised: true, topColor: '#c95a74' },
  [Tile.StoneBench]: { name: 'stone bench', solid: true, color: '#8a857a', raised: true, topColor: '#b3ada0' },
  // THE TRADES KEEP SHOP — minimap voice: each trade keys off its
  // own material (quench iron, grindstone grit, oven brick, dye
  // madder, herb green) so a workshop yard reads as a WORKSHOP at
  // chart scale, distinct from the street furniture beside it.
  [Tile.QuenchTrough]: { name: 'quench trough', solid: true, color: '#4c4a52', raised: true, topColor: '#8fb4c4' },
  [Tile.Grindstone]: { name: 'grindstone', solid: true, color: '#6f5a38', raised: true, topColor: '#b3ada0' },
  [Tile.IngotRack]: { name: 'ingot rack', solid: true, color: '#5c5648', raised: true, topColor: '#c2a45c' },
  [Tile.LumberRack]: { name: 'lumber rack', solid: true, color: '#75603e', raised: true, topColor: '#d4b98a' },
  [Tile.DyeVats]: { name: 'dye vats', solid: true, color: '#75603e', raised: true, topColor: '#a04a58' },
  [Tile.TailorsDummy]: { name: "tailor's dummy", solid: true, color: '#6f6a58', raised: true, topColor: '#7a86b8' },
  [Tile.ClothBolts]: { name: 'cloth bolts', solid: true, color: '#75603e', raised: true, topColor: '#c4808a' },
  [Tile.ButcherBlock]: { name: "butcher's block", solid: true, color: '#75603e', raised: true, topColor: '#c9856a' },
  [Tile.HerbRack]: { name: 'herb rack', solid: true, color: '#6f5a38', raised: true, topColor: '#7fae6a' },
  [Tile.ShopShelf]: { name: 'shop shelf', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  // THE SECOND SHIFT — minimap voice continues the first wave's law:
  // each trade keys off its own material (water reads WATER for all
  // three street pieces, kiln brick, scribe paper, chandler wax,
  // fletch red, cobbler leather, fish silver, merchant brass).
  [Tile.WallFountain]: { name: 'spring fount', solid: true, color: '#8a857a', raised: true, topColor: '#8fb4c4' },
  [Tile.WaterTrough]: { name: 'water trough', solid: true, color: '#75603e', raised: true, topColor: '#8fb4c4' },
  [Tile.ScribesDesk]: { name: "scribe's desk", solid: true, color: '#75603e', raised: true, topColor: '#e8dcc4' },
  [Tile.CandleRack]: { name: 'candle rack', solid: true, color: '#6f5a38', raised: true, topColor: '#e8d9b0' },
  [Tile.FletchersBench]: { name: "fletcher's bench", solid: true, color: '#75603e', raised: true, topColor: '#c05a48' },
  [Tile.FishmongerSlab]: { name: "fishmonger's slab", solid: true, color: '#8a857a', raised: true, topColor: '#b8c4cc' },
  [Tile.DisplayTable]: { name: 'display table', solid: true, color: '#75603e', raised: true, topColor: '#c9a13c' },
  // THE COMMONS — minimap voice: the general shelf keys warm and
  // quiet (candle wax, wicker, worn stone) so the SPECIALIST kits
  // beside it keep their loud material keys; only the festival
  // pole and the skiff's dyed strake fly color at chart scale.
  [Tile.CandleStand]: { name: 'candle stand', solid: true, color: '#4c4a52', raised: true, topColor: '#e8a13c' },
  [Tile.StreetLantern]: { name: 'street lantern', solid: true, color: '#6f5a38', raised: true, topColor: '#e0b060' },
  [Tile.WayShrine]: { name: 'wayshrine', solid: true, color: '#8a857a', raised: true, topColor: '#e8d9b0' },
  [Tile.GuardianStatue]: { name: 'guardian statue', solid: true, color: '#6f6a58', raised: true, topColor: '#b3ada0' },
  [Tile.TapCask]: { name: 'tap cask', solid: true, color: '#75603e', raised: true, topColor: '#c9955c' },
  [Tile.WoodStool]: { name: 'stool', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.BasketStack]: { name: 'basket stack', solid: true, color: '#a88f5c', raised: true, topColor: '#d8c49a' },
  [Tile.GlazedJars]: { name: 'glazed jars', solid: true, color: '#5c748a', raised: true, topColor: '#8fa8bd' },
  [Tile.BroomAndPail]: { name: 'broom and pail', solid: true, color: '#6f5a38', raised: true, topColor: '#d8c49a' },
  [Tile.LeanLadder]: { name: 'leaning ladder', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.Wheelbarrow]: { name: 'wheelbarrow', solid: true, color: '#75603e', raised: true, topColor: '#a3814a' },
  [Tile.WayfarersRest]: { name: "wayfarer's rest", solid: true, color: '#8a744e', raised: true, topColor: '#8a9a4f' },
  [Tile.MooringPost]: { name: 'mooring post', solid: true, color: '#4e4438', raised: true, topColor: '#a89263' },
  [Tile.BeachedSkiff]: { name: 'beached skiff', solid: true, color: '#6f5a38', raised: true, topColor: '#8fa8bd' },
  // THE WARREN AND THE LEGION: the camp browns again — axe-hewn wood,
  // bone, scrap iron — with the wave's few loud notes (the tabard's
  // madder, the legion's bronze, the effigy's painted grin) on top.
  [Tile.BoneMidden]: { name: 'bone midden', solid: true, color: '#a89a80', raised: true, topColor: '#c9c2ae' },
  [Tile.TrophyStake]: { name: 'trophy stake', solid: true, color: '#6b4a26', raised: true, topColor: '#8b93a4' },
  [Tile.GrogTub]: { name: 'grog tub', solid: true, color: '#5e4023', raised: true, topColor: '#8a7a3a' },
  [Tile.KnucklePit]: { name: 'knucklebone pit', solid: true, color: '#8a6534', raised: true, topColor: '#c9c2ae' },
  [Tile.RagNest]: { name: 'rag nest', solid: true, color: '#6e5a44', raised: true, topColor: '#8a3b34' },
  [Tile.BeastStake]: { name: 'beast stake', solid: true, color: '#57535f', raised: true, topColor: '#3a3444' },
  [Tile.CritterCage]: { name: 'critter cage', solid: true, color: '#8a713f', raised: true, topColor: '#a88f5c' },
  [Tile.AlarmGong]: { name: 'alarm gong', solid: true, color: '#6b4a26', raised: true, topColor: '#b08d3c' },
  [Tile.WarTable]: { name: 'war table', solid: true, color: '#6b4a26', raised: true, topColor: '#c9b684' },
  [Tile.PlunderCart]: { name: 'plunder cart', solid: true, color: '#6e4a33', raised: true, topColor: '#9c8a62' },
  [Tile.BossEffigy]: { name: 'warboss effigy', solid: true, color: '#6b4a26', raised: true, topColor: '#8a3b34' },
  [Tile.GnawTrough]: { name: 'gnaw trough', solid: true, color: '#5e4023', raised: true, topColor: '#7d5a2e' },
  // THE HERBALIST'S SHELF — minimap voice: cooper's oak under working
  // green (the herb rows out-read the rim from the sky).
  [Tile.HerbPlanter]: { name: 'herb planter', solid: true, color: '#6f4d26', raised: true, topColor: '#5d7c42' },
  // THE CHORE STANDS ALONE — minimap voice: bark below, bright-scarred
  // end grain above (the block reads by its worked top from the sky).
  // THE LOG YARD — minimap voice: heavy bark masses; the end-on pile
  // alone shows cut-face pale (its faces aim at the sky's camera too).
  [Tile.FelledLog]: { name: 'felled log', solid: true, color: '#6f4d26', raised: true, topColor: '#8a6534' },
  [Tile.LogPile]: { name: 'log pile', solid: true, color: '#6f4d26', raised: true, topColor: '#96713c' },
  [Tile.LogPileEndOn]: { name: 'end-on log pile', solid: true, color: '#6f4d26', raised: true, topColor: '#c9ab74' },
  [Tile.TiedParcels]: { name: 'tied parcels', solid: true, color: '#a08a62', raised: true, topColor: '#c4b491' },
  // THE KEPT FLAME — minimap voice: lit candles read flame-amber
  // from the sky; snuffed ones read as the wax they are.
  [Tile.CandleCluster]: { name: 'candle cluster', solid: true, color: '#8a7d5e', raised: true, topColor: '#e8a13c' },
  [Tile.CandleClusterOut]: { name: 'candle cluster', solid: true, color: '#8a7d5e', raised: true, topColor: '#d8cba8' },
  [Tile.MeltedCandles]: { name: 'melted candles', solid: true, color: '#8a7d5e', raised: true, topColor: '#e8a13c' },
  [Tile.MeltedCandlesOut]: { name: 'melted candles', solid: true, color: '#8a7d5e', raised: true, topColor: '#d8cba8' },
  [Tile.CandleTable]: { name: 'candle table', solid: true, color: '#6b4a26', raised: true, topColor: '#e8a13c' },
  [Tile.CandleTableOut]: { name: 'candle table', solid: true, color: '#6b4a26', raised: true, topColor: '#d8cba8' },
  [Tile.CandleStandOut]: { name: 'candle stand', solid: true, color: '#4c4a52', raised: true, topColor: '#d8cba8' },
  [Tile.PillarCandle]: { name: 'pillar candle', solid: true, color: '#8a7d5e', raised: true, topColor: '#e8a13c' },
  [Tile.PillarCandleOut]: { name: 'pillar candle', solid: true, color: '#8a7d5e', raised: true, topColor: '#d8cba8' },
  [Tile.TripleCandles]: { name: 'triple candles', solid: true, color: '#8a7d5e', raised: true, topColor: '#e8a13c' },
  [Tile.TripleCandlesOut]: { name: 'triple candles', solid: true, color: '#8a7d5e', raised: true, topColor: '#d8cba8' },
  // THE KNIGHT'S KEEPING: oak under steel; the dressed stand reads
  // steel from the sky, the standard reads its cloth.
  [Tile.ArmorStand]: { name: 'armor stand', solid: true, color: '#5e3f1e', raised: true, topColor: '#7a552e' },
  [Tile.ArmorStandFull]: { name: 'armor stand', solid: true, color: '#5e3f1e', raised: true, topColor: '#aeb6c6' },
  [Tile.BannerStand]: { name: 'banner stand', solid: true, color: '#454052', raised: true, topColor: '#8a2b35' },
  // THE IRON REST: cold iron over curb stone from above; the gate
  // tiles keep the fence-gate posture law (open walkable, shut not).
  [Tile.IronFence]: { name: 'iron fence', solid: true, color: '#33303f', raised: true, topColor: '#4c485c' },
  [Tile.IronFenceDiagNE]: { name: 'iron fence', solid: true, color: '#33303f', raised: true, topColor: '#4c485c' },
  [Tile.IronFenceDiagNW]: { name: 'iron fence', solid: true, color: '#33303f', raised: true, topColor: '#4c485c' },
  [Tile.IronGate]: { name: 'graveyard gate', solid: false, color: '#33303f', raised: true, topColor: '#4c485c' },
  [Tile.IronGateShut]: { name: 'shut graveyard gate', solid: true, color: '#2c2938', raised: true, topColor: '#4c485c' },
  [Tile.Gravestone]: { name: 'gravestone', solid: true, color: '#6b6678', raised: true, topColor: '#8f8a9e' },
  [Tile.GravestoneTall]: { name: 'grave monument', solid: true, color: '#625d70', raised: true, topColor: '#8f8a9e' },
  [Tile.GraveMound]: { name: 'grave mound', solid: true, color: '#4a3a2c', raised: true, topColor: '#5e4a36' },
  [Tile.MournerStatue]: { name: 'mourner statue', solid: true, color: '#726d80', raised: true, topColor: '#a29db2' },
  // THE SCARRED LAND (505..545): every piece is raised (the prop hall
  // paints it, walkable or not — a walkable prop is a low prop, never
  // a ground material) and the name IS the museum plaque. Inks: char,
  // ash, ember, gloom, rag red, Legion crimson, charter brass.
  // A. the cold hearth
  [Tile.RuinWallStone]: { name: 'ruined stone wall', solid: true, color: '#5b5566', raised: true, topColor: '#7d7789' },
  [Tile.RuinWallWood]: { name: 'ruined timber wall', solid: true, color: '#2f2a30', raised: true, topColor: '#4a4348' },
  [Tile.CharredBeam]: { name: 'charred beam', solid: true, color: '#2a2529', raised: true, topColor: '#45403f' },
  [Tile.CollapsedRoof]: { name: 'collapsed roof', solid: true, color: '#4a3f33', raised: true, topColor: '#6a5c48' },
  [Tile.AshHeap]: { name: 'ash heap', solid: false, color: '#6d6a70', raised: true, topColor: '#8d8a90' },
  [Tile.EmberBed]: { name: 'ember bed', solid: true, color: '#3a2f2e', raised: true, topColor: '#c8552a' },
  [Tile.ChimneyStack]: { name: 'chimney stack', solid: true, color: '#524c5c', raised: true, topColor: '#736d80' },
  // B. the field after
  [Tile.BrokenCart]: { name: 'broken cart', solid: true, color: '#5e4630', raised: true, topColor: '#7d6040' },
  [Tile.FieldLitter]: { name: 'field litter', solid: false, color: '#5c5a5f', raised: true, topColor: '#8a8890' },
  [Tile.ArrowPost]: { name: 'arrow post', solid: true, color: '#5a4226', raised: true, topColor: '#7a5c36' },
  [Tile.FallenBanner]: { name: 'fallen banner', solid: true, color: '#5a3a3e', raised: true, topColor: '#8a3d48' },
  [Tile.FieldCairn]: { name: 'field cairn', solid: true, color: '#7c7889', raised: true, topColor: '#a29db2' },
  [Tile.CairnFallen]: { name: 'fallen cairn', solid: false, color: '#7c7889', raised: true, topColor: '#a29db2' },
  [Tile.BeastBones]: { name: 'beast bones', solid: true, color: '#b5ac91', raised: true, topColor: '#cfc7ae' },
  // C. the stripped land
  [Tile.CharredStump]: { name: 'charred stump', solid: false, color: '#2a2529', raised: true, topColor: '#4a4448' },
  [Tile.DeadTree]: { name: 'dead tree', solid: true, color: '#4a4046', raised: true, topColor: '#6a6068' },
  [Tile.SpoilHeap]: { name: 'spoil heap', solid: true, color: '#5c4a38', raised: true, topColor: '#7a6650' },
  // D. the gloom
  [Tile.GloomStone]: { name: 'gloom stone', solid: true, color: '#3c3a52', raised: true, topColor: '#7f8cc4' },
  [Tile.CreepRoot]: { name: 'creep root', solid: true, color: '#3a3038', raised: true, topColor: '#57484f' },
  [Tile.FoulPool]: { name: 'foul pool', solid: false, color: '#2f3d38', raised: true, topColor: '#4c6a58' },
  [Tile.CropBlighted]: { name: 'blighted crop', solid: false, color: '#3a3430', raised: true, topColor: '#5a5044' },
  // E. the marks
  [Tile.CharterPost]: { name: 'charter post', solid: true, color: '#5a4226', raised: true, topColor: '#c9a14a' },
  [Tile.LampCairn]: { name: 'lamp cairn', solid: true, color: '#7c7889', raised: true, topColor: '#e8c06a' },
  [Tile.LegionStandard]: { name: 'legion standard', solid: true, color: '#3a3444', raised: true, topColor: '#8a1f2a' },
  [Tile.BoneTree]: { name: 'bone tree', solid: true, color: '#4a4046', raised: true, topColor: '#cfc7ae' },
  [Tile.TallyStone]: { name: 'tally stone', solid: true, color: '#6b6678', raised: true, topColor: '#8f8a9e' },
  [Tile.WardThread]: { name: 'ward thread', solid: false, color: '#5a4226', raised: true, topColor: '#d8cba8' },
  [Tile.RedRagStake]: { name: 'red rag stake', solid: true, color: '#5a4226', raised: true, topColor: '#a8323a' },
  [Tile.PitLamp]: { name: 'pit lamp', solid: true, color: '#3a3444', raised: true, topColor: '#e8933c' },
  [Tile.PitLampDark]: { name: 'dark pit lamp', solid: true, color: '#3a3444', raised: true, topColor: '#5d5670' },
  // F. the displaced
  [Tile.LeanTo]: { name: 'lean-to', solid: true, color: '#6a5a44', raised: true, topColor: '#8d7c66' },
  [Tile.Bedroll]: { name: 'bedroll', solid: false, color: '#5d4f42', raised: true, topColor: '#7a6a58' },
  [Tile.BelongingsCart]: { name: 'belongings cart', solid: true, color: '#6e4a33', raised: true, topColor: '#9c8a62' },
  [Tile.FieldCot]: { name: 'field cot', solid: true, color: '#6a5a44', raised: true, topColor: '#8d7c66' },
  // G. the states
  [Tile.FenceBroken]: { name: 'broken fence', solid: false, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.SignpostBurnt]: { name: 'burnt signpost', solid: true, color: '#2a2529', raised: true, topColor: '#4a4448' },
  [Tile.WellFouled]: { name: 'fouled well', solid: true, color: '#6e6a75', raised: true, topColor: '#4c6a58' },
  [Tile.HedgeDead]: { name: 'dead hedge', solid: true, color: '#4a4030', raised: true, topColor: '#6a5c44' },
  [Tile.LampPostDark]: { name: 'dark lamp post', solid: true, color: '#3a3444', raised: true, topColor: '#5d5670' },
  [Tile.SluiceGate]: { name: 'sluice gate', solid: true, color: '#5a4226', raised: true, topColor: '#7a5c36' },
  [Tile.SluiceGateStrung]: { name: 'strung sluice gate', solid: true, color: '#5a4226', raised: true, topColor: '#4c6a58' },
};

// THE KNIGHT'S KEEPING: the standing banner's dye band — defs for
// dyes 1..9 generated from the anchor (the awning-band precedent).
for (let dye = 1; dye < DYE_COUNT; dye++) {
  (TILE_DEFS as Record<number, TileDef>)[Tile.BannerStand + dye] = TILE_DEFS[Tile.BannerStand]!;
}

/** The four awning silhouettes, index order FOREVER (the id math). */
export const AWNING_SHAPES = ['shed', 'market', 'board', 'bowed'] as const;
export type AwningShape = (typeof AWNING_SHAPES)[number];

export const AWNING_BASES: readonly Tile[] = [
  Tile.AwningShed,
  Tile.AwningMarket,
  Tile.AwningBoard,
  Tile.AwningBowed,
];
