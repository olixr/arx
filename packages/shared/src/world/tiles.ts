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
  /** A stone wall with a glazed window — merges into wall runs. */
  WallStoneWindow = 59,
  /** A wood wall with a shuttered window — merges into wall runs. */
  WallWoodWindow = 60,
  /** WALKABLE framed opening in a stone wall run — a real doorway. */
  DoorwayStone = 61,
  /** WALKABLE framed opening in a wood wall run. */
  DoorwayWood = 62,
  /** WALKABLE freestanding arch — colonnades, plaza gateways. */
  ArchStone = 63,
  /** Freestanding column you walk around — porches, colonnades. */
  PillarStone = 64,
  /** Half-height railing — porches, jetties, balconies. */
  RailWood = 65,
  // 66-79 reserved for future wall vocabulary.
  /** A banded oak barrel — the workhorse of clutter. */
  Barrel = 80,
  /** A plank shipping crate. */
  Crate = 81,
  /** A crate heaped with market produce. */
  CrateGoods = 82,
  /** A table — adjacent tables merge into one long board. */
  Table = 83,
  /** A chair; its back turns away from any adjacent table. */
  Chair = 84,
  /** A bench/pew — east-west runs merge. */
  Bench = 85,
  /** A bed: frame, mattress, pillow, blanket. */
  Bed = 86,
  /** A tall bookshelf full of spines. */
  Bookshelf = 87,
  /** A low two-door cabinet. */
  Cabinet = 88,
  /** A service counter — runs merge; NOT the shop counter station. */
  Counter = 89,
  /** A stone hearth with a live fire — warm light after dark. */
  Hearth = 90,
  /** A canopied market stall — 2-wide runs share one canopy. */
  MarketStall = 91,
  /** A pole flying a hanging cloth banner. */
  BannerPole = 92,
  /** A post with a swinging shingle sign. */
  HangingSign = 93,
  /** A low planter box in bloom. */
  FlowerBox = 94,
  /** A board of smithing tools. */
  ToolRack = 95,
  /** A rack of spears and blades. */
  WeaponRack = 96,
  /** A massive iron strongbox — the bank's set-piece. */
  Vault = 97,
  /** A slim stand bearing an open tome. */
  Lectern = 98,
  /** A stone water trough. */
  Basin = 99,
  /** A weeping willow — damp deep forest; willow logs for bowyers. */
  TreeWillow = 100,
  /** An ancient yew — rare, dark, slow-grown; the war-bow wood. */
  TreeYew = 101,
  /** A hide stretched taut on a timber frame — the leatherworker's station. */
  TanningRack = 102,
  /** A warp-strung weaving loom — the tailor's station. */
  Loom = 103,
  /** A shaving-strewn bowyer's bench with vise and drawknife — the woodworker's station. */
  CarvingBench = 104,
  /** A rune-carved worktable bearing an open tome and cradled focus stone — the enchanter's station. */
  EnchantingTable = 105,
  /** A young tree standing up from a felled stump — walkable, not yet choppable. */
  Sapling = 106,
  /** An oak sapling. */
  SaplingOak = 107,
  /** A willow sapling. */
  SaplingWillow = 108,
  /** A yew sapling. */
  SaplingYew = 109,
}

export enum Detail {
  None = 0,
  Flowers = 1,
  Tuft = 2,
  Pebbles = 3,
  Mushroom = 4,
  // Baked floor decor — authored-only, walkable, painted into the
  // terrain bake (players place solid prop tiles, never detail).
  Rug = 5,
  RugRound = 6,
  Doormat = 7,
  Sawdust = 8,
  Straw = 9,
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
  [Tile.TreeWillow]: { name: 'willow tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#5a8a4a' },
  [Tile.TreeYew]: { name: 'yew tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#1e4028' },
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
  [Tile.EnchantingTable]: { name: 'enchanting table', solid: true, color: '#4a3f5e', raised: true, topColor: '#7a6aa8' },
  // Saplings: the middle beat of tree regrowth (stump → sapling →
  // tree). Walkable — you step over a knee-high whip — and not a
  // gather node, so they can't be chopped back down mid-growth.
  [Tile.Sapling]: { name: 'sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#57a04b' },
  [Tile.SaplingOak]: { name: 'oak sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#2d6631' },
  [Tile.SaplingWillow]: { name: 'willow sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#5a8a4a' },
  [Tile.SaplingYew]: { name: 'yew sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#1e4028' },
};

/**
 * Tiles that merge into continuous wall runs for the renderer's
 * auto-tiler: solid walls, windowed walls, and walkable doorways all
 * join the same mass so a building reads as one structure.
 */
export const WALL_RUN_TILES: readonly Tile[] = [
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.DoorwayStone,
  Tile.DoorwayWood,
];

/**
 * Tiles that bound an interior region (the room enclosure test).
 * Doorways count — a doorway-closed ring encloses. Arches and
 * railings deliberately do NOT: a colonnade plaza is never a room.
 */
export const INTERIOR_BOUNDARY_TILES: readonly Tile[] = [...WALL_RUN_TILES];

/**
 * Tiles that stop lamplight in the lightmap. Doorways and arches let
 * light spill through openings; windows block (their glow is faked
 * with placed emitters instead).
 */
export const LIGHT_BLOCKING_TILES: readonly Tile[] = [
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.PillarStone,
];

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
export type StationType =
  | 'fire'
  | 'furnace'
  | 'anvil'
  | 'workbench'
  | 'alembic'
  | 'tanning_rack'
  | 'loom'
  | 'carving_bench'
  | 'enchanting_table';

export const STATION_TILES: Record<StationType, Tile> = {
  fire: Tile.Campfire,
  furnace: Tile.Furnace,
  anvil: Tile.Anvil,
  workbench: Tile.Workbench,
  alembic: Tile.Alembic,
  tanning_rack: Tile.TanningRack,
  loom: Tile.Loom,
  carving_bench: Tile.CarvingBench,
  enchanting_table: Tile.EnchantingTable,
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

/**
 * Sub-tile colliders: solid tiles whose visual mass is a centered
 * column (tree trunks, the lamp post) or boulder pile rather than a
 * full block. Movement and projectiles collide with a circle of this
 * radius at the tile centre — bodies brush past the canopy's tile
 * corners and arrows bury in the trunk, not an invisible box.
 * Pathfinding still treats the whole tile as blocked.
 */
const TILE_COLLIDER_RADIUS = new Map<Tile, number>([
  // Tree radii track the DRAWN flared trunk base (client
  // render/trees.ts maxTrunkBaseRadius — a test pins the pairing):
  // tight groves stay walkable because you collide with exactly the
  // wood you see, never an invisible box around the canopy.
  [Tile.Tree, 0.26],
  [Tile.TreeOak, 0.38],
  [Tile.TreeWillow, 0.26],
  [Tile.TreeYew, 0.34],
  [Tile.Rock, 0.4],
  [Tile.RockCopper, 0.46],
  [Tile.RockTin, 0.46],
  [Tile.RockIron, 0.46],
  [Tile.RockCoal, 0.46],
  [Tile.RockGold, 0.46],
  [Tile.RockDepleted, 0.36],
  [Tile.LampPost, 0.2],
]);

/** Collider radius for a centered-mass tile, or null for full-block solids. */
export function tileColliderRadius(id: number): number | null {
  return TILE_COLLIDER_RADIUS.get(id as Tile) ?? null;
}

/**
 * Tree regrowth staging: a felled tree leaves a stump, the stump
 * sprouts the species' sapling partway through the respawn wait, and
 * the sapling stands up into the full tree. One law source for the
 * server's respawn queue and the client's transition effects.
 */
const SAPLING_OF = new Map<Tile, Tile>([
  [Tile.Tree, Tile.Sapling],
  [Tile.TreeOak, Tile.SaplingOak],
  [Tile.TreeWillow, Tile.SaplingWillow],
  [Tile.TreeYew, Tile.SaplingYew],
]);
const TREE_OF_SAPLING = new Map<Tile, Tile>(
  [...SAPLING_OF].map(([tree, sap]) => [sap, tree]),
);

/** The tree tiles that fell, stump, and regrow. */
export const TREE_TILES: ReadonlySet<Tile> = new Set(SAPLING_OF.keys());

/** The sapling stage for a tree tile, or null if it isn't a tree. */
export function saplingOf(id: number): Tile | null {
  return SAPLING_OF.get(id as Tile) ?? null;
}

/** The grown tree a sapling becomes, or null if it isn't a sapling. */
export function treeOfSapling(id: number): Tile | null {
  return TREE_OF_SAPLING.get(id as Tile) ?? null;
}
