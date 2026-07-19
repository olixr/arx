/**
 * Tile registry. Tiles are u16 ids on the wire; defs drive collision
 * (shared) and rendering (client). Detail-layer tiles are cosmetic only.
 */

export enum Tile {
  Void = 0,
  Grass = 1,
  GrassTall = 2,
  Dirt = 3,
  Path = 4,
  Sand = 5,
  Water = 6,
  WaterDeep = 7,
  StoneFloor = 8,
  WoodFloor = 9,
  WallStone = 10,
  WallWood = 11,
  Tree = 12,
  Rock = 13,
  Stump = 14,
  Fence = 15,
  Bridge = 16,
  Snow = 17,
  Swamp = 18,
  TreeOak = 19,
  RockCopper = 20,
  RockIron = 21,
  RockDepleted = 22,
  FishingSpot = 23,
  Campfire = 24,
  Furnace = 25,
  Anvil = 26,
  Workbench = 27,
  BankChest = 28,
  ShopCounter = 29,
  CaveWall = 30,
  CaveFloor = 31,
  PortalDown = 32,
  PortalUp = 33,
  /** Solid rock face forming the rim of an elevated plateau. */
  Cliff = 34,
  /** Walkable stone stair connecting two elevation levels. */
  Ramp = 35,
  RockTin = 36,
  RockCoal = 37,
  RockGold = 38,
  /** An iron lantern on a post — a warm town light after dark. */
  LampPost = 39,
  /** Player-built garden plot: dark furrowed soil, ready for seeds. */
  Tilled = 40,
  /** Freshly planted — a generic green shoot; the crop record knows what it is. */
  CropSprout = 41,
  CarrotMid = 42,
  CarrotRipe = 43,
  SagewortMid = 44,
  SagewortRipe = 45,
  SunflowerMid = 46,
  SunflowerRipe = 47,
  WheatMid = 48,
  WheatRipe = 49,
  CottonMid = 50,
  CottonRipe = 51,
  MoonbellMid = 52,
  MoonbellRipe = 53,
  /** Herbalism station: a workbench of glass retorts and bubbling beakers. */
  Alembic = 54,
  BerryBush = 55,
  FibrePlant = 56,
  WildSagewort = 57,
  WildMoonbell = 58,
}

export enum Detail {
  None = 0,
  Flowers = 1,
  Tuft = 2,
  Pebbles = 3,
  Mushroom = 4,
}

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
  [Tile.Snow]: { name: 'snow', solid: false, color: '#e8ecf2', variants: ['#dfe4ec'] },
  [Tile.Swamp]: { name: 'swamp', solid: false, color: '#4d6b3c', variants: ['#476339'] },
  [Tile.TreeOak]: { name: 'oak tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#1f5426' },
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
};

/** Every mineable/mined rock formation tile, ore-bearing or not. */
export const ROCK_TILES: readonly Tile[] = [
  Tile.Rock,
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockDepleted,
];

/** Ore-bearing rocks only — the ones a pickaxe gets something out of. */
export const ORE_TILES: readonly Tile[] = [
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
];

/** Crafting stations, keyed by what recipes call them. */
export type StationType = 'fire' | 'furnace' | 'anvil' | 'workbench' | 'alembic';

export const STATION_TILES: Record<StationType, Tile> = {
  fire: Tile.Campfire,
  furnace: Tile.Furnace,
  anvil: Tile.Anvil,
  workbench: Tile.Workbench,
  alembic: Tile.Alembic,
};

export function stationAtTile(tile: number): StationType | null {
  for (const [station, t] of Object.entries(STATION_TILES)) {
    if (t === tile) return station as StationType;
  }
  return null;
}

export function tileDef(id: number): TileDef {
  return TILE_DEFS[id as Tile] ?? TILE_DEFS[Tile.Void];
}

export function isSolidTile(id: number): boolean {
  return tileDef(id).solid;
}
